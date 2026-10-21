// Project milestones: the board (every project with its milestones, progress and dates), one milestone with its tasks,
// create / edit / delete / reorder, and "complete all tasks". Visibility follows the projects permission (View own = projects the person is in).
import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId, hasCap } from '@/lib/crm/permissions'
import { milestoneState, percent, daysLeft } from '@/lib/crm/milestonesCalc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
const NONE = '000000000000000000000000'

async function access(cap = 'view') {
    const session = await requirePermission('projects', cap)
    const authority = session.user.authority || []
    return { session, authority, scope: viewScope(authority, 'projects'), staffId: await getStaffId(session), can: (c) => hasCap(authority, 'projects', c) }
}
async function visibleProjects(a) {
    if (a.scope === 'all') return {}
    if (!a.staffId) return { id: NONE }
    const mine = await prisma.crmProjectMember.findMany({ where: { staffId: a.staffId }, select: { projectId: true } })
    return { OR: [{ id: { in: mine.map((m) => m.projectId) } }, { addedFrom: a.staffId }] }
}
const mayProject = async (a, projectId) => !!(await prisma.crmProject.findFirst({ where: { AND: [{ id: projectId }, await visibleProjects(a)] }, select: { id: true } }))

const PROJECT_STATUS = { 1: 'Not started', 2: 'In progress', 3: 'On hold', 4: 'Finished', 5: 'Cancelled' }

async function taskCounts(projectIds) {
    const tasks = projectIds.length ? await prisma.crmTask.findMany({ where: { relType: 'project', relId: { in: projectIds } }, select: { relId: true, milestoneId: true, status: true, dueDate: true } }) : []
    const out = new Map()
    const now = new Date()
    for (const t of tasks) {
        const k = t.milestoneId || `none:${t.relId}`
        const c = out.get(k) || { total: 0, done: 0, late: 0 }
        c.total++
        if (t.status === 5) c.done++
        else if (t.dueDate && new Date(t.dueDate) < new Date(now.toDateString())) c.late++
        out.set(k, c)
    }
    return out
}

const shape = (m, counts) => {
    const tasks = counts.get(m.id) || { total: 0, done: 0, late: 0 }
    return { id: m.id, projectId: m.projectId, name: m.name, color: m.color || null, dueDate: m.dueDate, order: m.milestoneOrder, description: m.description || '', visibleToCustomer: !!m.descriptionVisibleToCustomer, tasks, percent: percent(tasks), state: milestoneState({ dueDate: m.dueDate, tasks }), daysLeft: daysLeft(m.dueDate) }
}

export async function milestonesBoard({ projectId, query } = {}) {
    const a = await access('view')
    const where = { AND: [await visibleProjects(a), oid(projectId) ? { id: projectId } : {}, { status: { notIn: [5] } }] }
    const projects = await prisma.crmProject.findMany({ where, orderBy: [{ status: 'asc' }, { name: 'asc' }], select: { id: true, name: true, status: true, clientId: true, deadline: true } })
    const ids = projects.map((p) => p.id)
    const [milestones, counts, clients] = await Promise.all([
        ids.length ? prisma.crmMilestone.findMany({ where: { projectId: { in: ids } }, orderBy: [{ milestoneOrder: 'asc' }, { createdAt: 'asc' }] }) : [],
        taskCounts(ids),
        prisma.crmClient.findMany({ where: { id: { in: projects.map((p) => p.clientId).filter(Boolean) } }, select: { id: true, company: true } }),
    ])
    const cname = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    const q = String(query || '').trim().toLowerCase()
    const out = projects.map((p) => {
        const list = milestones.filter((m) => m.projectId === p.id).map((m) => shape(m, counts))
        const none = counts.get(`none:${p.id}`) || { total: 0, done: 0, late: 0 }
        return { id: p.id, name: p.name, client: cname[p.clientId] || '', status: p.status, statusLabel: PROJECT_STATUS[p.status] || '', deadline: p.deadline, milestones: list, noMilestoneTasks: none.total - none.done }
    }).map((p) => (q ? { ...p, milestones: p.milestones.filter((m) => m.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) } : p))
    const all = out.flatMap((p) => p.milestones)
    return {
        projects: q ? out.filter((p) => p.milestones.length) : out,
        stats: { total: all.length, open: all.filter((m) => !['done'].includes(m.state)).length, overdue: all.filter((m) => m.state === 'overdue').length, done: all.filter((m) => m.state === 'done').length },
        can: { create: a.can('create'), edit: a.can('edit'), delete: a.can('delete'), tasks: hasCap(a.authority, 'tasks', 'create') },
    }
}

async function loadMilestone(id, a) {
    const m = await prisma.crmMilestone.findUnique({ where: { id } })
    if (!m || !(await mayProject(a, m.projectId))) throw fail('Milestone not found', 404)
    return m
}

/** One milestone with its tasks (for the popup). */
export async function getMilestone(id) {
    const a = await access('view')
    const m = await loadMilestone(id, a)
    const tasks = await prisma.crmTask.findMany({ where: { relType: 'project', relId: m.projectId, milestoneId: id }, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }], select: { id: true, name: true, status: true, dueDate: true } })
    const project = await prisma.crmProject.findUnique({ where: { id: m.projectId }, select: { name: true } })
    const counts = new Map([[id, { total: tasks.length, done: tasks.filter((t) => t.status === 5).length, late: 0 }]])
    return { ...shape(m, counts), project: project?.name || '', taskList: tasks }
}

export async function saveMilestone(body, id) {
    const a = await access(id ? 'edit' : 'create')
    const name = nz(body.name)
    if (!name) throw fail('Give the milestone a name')
    const data = { name, description: nz(body.description), descriptionVisibleToCustomer: !!body.visibleToCustomer, dueDate: body.dueDate ? new Date(body.dueDate) : null, color: /^#[0-9a-f]{3,8}$/i.test(body.color || '') ? body.color : null }
    if (id) {
        await loadMilestone(id, a)
        await prisma.crmMilestone.update({ where: { id }, data })
        return { success: true, id }
    }
    const projectId = oid(body.projectId)
    if (!projectId || !(await mayProject(a, projectId))) throw fail('Choose a project')
    const last = await prisma.crmMilestone.findFirst({ where: { projectId }, orderBy: { milestoneOrder: 'desc' }, select: { milestoneOrder: true } })
    const row = await prisma.crmMilestone.create({ data: { ...data, projectId, milestoneOrder: (last?.milestoneOrder || 0) + 1 } })
    return { success: true, id: row.id }
}

export async function deleteMilestone(id) {
    const a = await access('delete')
    await loadMilestone(id, a)
    // the tasks stay, without a milestone
    await prisma.crmTask.updateMany({ where: { milestoneId: id }, data: { milestoneId: null } })
    await prisma.crmMilestone.delete({ where: { id } })
    return { success: true }
}

export async function reorderMilestones(projectId, ids) {
    const a = await access('edit')
    if (!oid(projectId) || !(await mayProject(a, projectId))) throw fail('Project not found', 404)
    const valid = new Set((await prisma.crmMilestone.findMany({ where: { projectId }, select: { id: true } })).map((m) => m.id))
    const list = (ids || []).filter((i) => valid.has(i))
    await Promise.all(list.map((mid, i) => prisma.crmMilestone.update({ where: { id: mid }, data: { milestoneOrder: i + 1 } })))
    return { success: true }
}

/** Marks every open task of the milestone complete. Needs the right to edit tasks too. */
export async function completeMilestone(id) {
    const a = await access('edit')
    await requirePermission('tasks', 'edit')
    const m = await loadMilestone(id, a)
    const r = await prisma.crmTask.updateMany({ where: { relType: 'project', relId: m.projectId, milestoneId: id, status: { not: 5 } }, data: { status: 5, dateFinished: new Date() } })
    return { success: true, completed: r.count }
}
