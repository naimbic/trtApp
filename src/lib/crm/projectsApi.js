import { realPicture } from '@/lib/crm/pictures'
import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId, hasCap } from '@/lib/crm/permissions'
import { storeRich } from '@/lib/crm/richText'

// Perfex project statuses: 4 = finished, 5 = cancelled (dateFinished is only set on finished ones)
export const STATUS = { 1: 'Not started', 2: 'In progress', 3: 'On hold', 4: 'Finished', 5: 'Cancelled' }
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const NONE = '000000000000000000000000'
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
const date = (v) => (v ? new Date(v) : null)

async function access(session) {
    const authority = session.user.authority || []
    return { authority, scope: viewScope(authority, 'projects'), staffId: await getStaffId(session), session, can: (cap) => hasCap(authority, 'projects', cap) }
}
async function visible(a) {
    if (a.scope === 'all') return {}
    if (!a.staffId) return { id: NONE }
    const mine = await prisma.crmProjectMember.findMany({ where: { staffId: a.staffId }, select: { projectId: true } })
    return { OR: [{ id: { in: mine.map((m) => m.projectId) } }, { addedFrom: a.staffId }] }
}

const staffName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'
async function staffMap(ids) {
    const list = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(ids.filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }) : []
    return Object.fromEntries(list.map((s) => [s.id, { id: s.id, name: staffName(s), image: realPicture(s.profileImage) }]))
}

const readable = (key, extra) => {
    const t = String(key || '').replace(/^not_/, '').replace(/^project_activity_/, '').replace(/^project_/, '').replace(/_/g, ' ')
    const text = t.charAt(0).toUpperCase() + t.slice(1)
    const more = String(extra || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    return more ? `${text} · ${more}` : text
}

/** done / total tasks, tracked seconds for a set of projects */
async function taskStats(ids) {
    const tasks = await prisma.crmTask.findMany({ where: { relType: 'project', relId: { in: ids } }, select: { id: true, relId: true, status: true } })
    const out = Object.fromEntries(ids.map((i) => [i, { total: 0, done: 0, seconds: 0 }]))
    const byTask = {}
    for (const t of tasks) { out[t.relId].total++; if (t.status === 5) out[t.relId].done++; byTask[t.id] = t.relId }
    const ids2 = Object.keys(byTask)
    if (ids2.length) {
        const timers = await prisma.crmTaskTimer.findMany({ where: { taskId: { in: ids2 } }, select: { taskId: true, startTime: true, endTime: true } })
        for (const x of timers) if (x.startTime && x.endTime) out[byTask[x.taskId]].seconds += Math.max(0, (+x.endTime - +x.startTime) / 1000)
    }
    return out
}
const progressOf = (p, st) => (p.status === 4 ? 100 : p.progressFromTasks ? (st.total ? Math.round((st.done / st.total) * 100) : 0) : p.progress || 0)

export async function listProjects(q = {}) {
    const session = await requirePermission('projects', 'view')
    const a = await access(session)
    const and = [await visible(a)]
    if (q.status) and.push({ status: parseInt(q.status, 10) })
    if (oid(q.clientId)) and.push({ clientId: q.clientId })
    if (q.query) and.push({ name: { contains: q.query, mode: 'insensitive' } })
    // a date range on the start date, the deadline or the day the project was created (whole days, UTC like the other dates)
    const field = { startDate: 'startDate', deadline: 'deadline', createdAt: 'createdAt' }[q.dateField] || 'deadline'
    const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? new Date(`${v}T00:00:00.000Z`) : null)
    const from = day(q.from), to = day(q.to)
    if (from || to) and.push({ [field]: { ...(from ? { gte: from } : {}), ...(to ? { lt: new Date(+to + 86400000) } : {}) } })
    const projects = await prisma.crmProject.findMany({ where: { AND: and }, orderBy: { createdAt: 'desc' } })
    const ids = projects.map((p) => p.id)
    const [stats, members, clients] = await Promise.all([
        taskStats(ids),
        prisma.crmProjectMember.findMany({ where: { projectId: { in: ids } }, select: { projectId: true, staffId: true } }),
        prisma.crmClient.findMany({ where: { id: { in: projects.map((p) => p.clientId).filter(Boolean) } }, select: { id: true, company: true } }),
    ])
    const people = await staffMap(members.map((m) => m.staffId))
    const cMap = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    const counts = {}
    const list = projects.map((p) => {
        counts[p.status] = (counts[p.status] || 0) + 1
        const st = stats[p.id]
        return {
            id: p.id, name: p.name, status: p.status, statusLabel: STATUS[p.status] || '', client: p.clientId ? { id: p.clientId, name: cMap[p.clientId] || '' } : null,
            progress: progressOf(p, st), tasksTotal: st.total, tasksDone: st.done, seconds: Math.round(st.seconds), estimatedHours: p.estimatedHours, projectCost: p.projectCost, billingType: p.billingType, ratePerHour: p.projectRatePerHour, createdAt: p.createdAt, startDate: p.startDate, deadline: p.deadline,
            overdue: !!p.deadline && [1, 2, 3].includes(p.status) && new Date(p.deadline) < new Date(new Date().toDateString()),
            members: members.filter((m) => m.projectId === p.id).map((m) => people[m.staffId]).filter(Boolean),
        }
    })
    const totals = {
        total: list.length, active: list.filter((p) => p.status === 2).length, finished: list.filter((p) => p.status === 4).length, overdue: list.filter((p) => p.overdue).length,
        openTasks: list.reduce((n, p) => n + p.tasksTotal - p.tasksDone, 0), seconds: list.reduce((n, p) => n + p.seconds, 0), avgProgress: list.length ? Math.round(list.reduce((n, p) => n + p.progress, 0) / list.length) : 0,
    }
    return { list, counts, stats: totals, can: { create: a.can('create'), edit: a.can('edit'), delete: a.can('delete') } }
}

async function loadOne(id, a) {
    if (!oid(id)) throw fail('Project not found', 404)
    const p = await prisma.crmProject.findFirst({ where: { AND: [{ id }, await visible(a)] } })
    if (!p) throw fail('Project not found', 404)
    return p
}

export async function getProject(id) {
    const session = await requirePermission('projects', 'view')
    const a = await access(session)
    const p = await loadOne(id, a)
    const [stats, members, files, discussions, notes, activity, milestones, client] = await Promise.all([
        taskStats([id]),
        prisma.crmProjectMember.findMany({ where: { projectId: id } }),
        prisma.crmProjectFile.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
        prisma.crmProjectDiscussion.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
        prisma.crmProjectNote.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
        prisma.crmProjectActivity.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 150 }),
        prisma.crmMilestone.findMany({ where: { projectId: id }, orderBy: { milestoneOrder: 'asc' } }),
        p.clientId ? prisma.crmClient.findUnique({ where: { id: p.clientId }, select: { id: true, company: true } }) : null,
    ])
    const people = await staffMap([...members.map((m) => m.staffId), p.addedFrom, ...notes.map((n) => n.staffId), ...files.map((f) => f.staffId), ...discussions.map((d) => d.staffId), ...activity.map((x) => x.staffId)])
    const st = stats[id]
    const mTasks = await prisma.crmTask.groupBy({ by: ['milestoneId'], where: { relType: 'project', relId: id, milestoneId: { not: null } }, _count: { _all: true } }).catch(() => [])
    return {
        project: {
            id: p.id, name: p.name, description: p.description || '', status: p.status, statusLabel: STATUS[p.status], billingType: p.billingType, startDate: p.startDate, deadline: p.deadline, dateFinished: p.dateFinished,
            progress: progressOf(p, st), progressFromTasks: p.progressFromTasks, manualProgress: p.progress, projectCost: p.projectCost, projectRatePerHour: p.projectRatePerHour, estimatedHours: p.estimatedHours,
            client, clientId: p.clientId, createdAt: p.createdAt, addedBy: people[p.addedFrom] || null,
            members: members.map((m) => people[m.staffId]).filter(Boolean), memberIds: members.map((m) => m.staffId),
            overdue: !!p.deadline && [1, 2, 3].includes(p.status) && new Date(p.deadline) < new Date(new Date().toDateString()),
        },
        stats: { tasksTotal: st.total, tasksDone: st.done, seconds: Math.round(st.seconds), files: files.length },
        milestones: milestones.map((m) => ({ id: m.id, name: m.name, dueDate: m.dueDate, color: m.color, tasks: mTasks.find((x) => x.milestoneId === m.id)?._count._all || 0 })),
        files: files.map((f) => ({ id: f.id, name: f.subject || f.fileName, fileName: f.fileName, type: f.fileType, by: people[f.staffId] || null, date: f.createdAt, client: !!f.visibleToCustomer })),
        discussions: discussions.map((d) => ({ id: d.id, subject: d.subject, description: d.description || '', by: people[d.staffId] || null, date: d.createdAt, last: d.lastActivity })),
        notes: notes.map((n) => ({ id: n.id, content: n.content || '', by: people[n.staffId] || null, date: n.createdAt, mine: !!a.staffId && n.staffId === a.staffId })),
        activity: activity.map((x) => ({ id: x.id, text: readable(x.descriptionKey, x.additionalData), by: people[x.staffId]?.name || x.fullName || '', date: x.createdAt })),
        can: { edit: a.can('edit'), delete: a.can('delete') },
    }
}

async function log(projectId, a, key, extra) {
    await prisma.crmProjectActivity.create({ data: { projectId, staffId: a.staffId || undefined, fullName: a.session.user.name || null, descriptionKey: key, additionalData: extra || null, visibleToCustomer: false } })
}

export async function saveProject(body, id) {
    const session = await requirePermission('projects', id ? 'edit' : 'create')
    const a = await access(session)
    const name = nz(body.name)
    if (!name) throw fail('Give the project a name')
    const start = date(body.startDate), deadline = date(body.deadline)
    if (start && deadline && deadline < start) throw fail('The deadline cannot be before the start date')
    const status = [1, 2, 3, 4, 5].includes(+body.status) ? +body.status : 1
    const data = {
        name, description: storeRich(body.description), status, clientId: oid(body.clientId), billingType: [1, 2, 3].includes(+body.billingType) ? +body.billingType : 1,
        startDate: start, deadline, progressFromTasks: body.progressFromTasks !== false, progress: Math.min(Math.max(parseInt(body.progress, 10) || 0, 0), 100),
        projectCost: body.projectCost === '' || body.projectCost == null ? null : Number(body.projectCost) || 0, projectRatePerHour: body.projectRatePerHour === '' || body.projectRatePerHour == null ? null : Number(body.projectRatePerHour) || 0,
        estimatedHours: body.estimatedHours === '' || body.estimatedHours == null ? null : Number(body.estimatedHours) || 0,
    }
    let prev = null
    if (id) { prev = await loadOne(id, a); data.dateFinished = status === 4 ? prev.dateFinished || new Date() : null }
    else data.dateFinished = status === 4 ? new Date() : null
    const project = id ? await prisma.crmProject.update({ where: { id }, data }) : await prisma.crmProject.create({ data: { ...data, addedFrom: a.staffId, startDate: start || new Date() } })
    if (Array.isArray(body.memberIds)) {
        const want = [...new Set(body.memberIds.map(oid).filter(Boolean))]
        const have = await prisma.crmProjectMember.findMany({ where: { projectId: project.id } })
        const drop = have.filter((h) => !want.includes(h.staffId))
        if (drop.length) await prisma.crmProjectMember.deleteMany({ where: { id: { in: drop.map((d) => d.id) } } })
        for (const staffId of want.filter((w) => !have.some((h) => h.staffId === w))) await prisma.crmProjectMember.create({ data: { projectId: project.id, staffId } })
        if (id) { if (want.length > have.length - drop.length) await log(project.id, a, 'project_activity_added_team_member'); if (drop.length) await log(project.id, a, 'project_activity_removed_team_member') }
    }
    if (!id) await log(project.id, a, 'project_activity_created')
    else if (prev.status !== status) await log(project.id, a, status === 4 ? 'project_marked_as_finished' : 'project_status_updated', STATUS[status])
    else await log(project.id, a, 'project_activity_updated')
    return { success: true, id: project.id }
}

export async function deleteProject(id) {
    const session = await requirePermission('projects', 'delete')
    const a = await access(session)
    await loadOne(id, a)
    const tasks = await prisma.crmTask.findMany({ where: { relType: 'project', relId: id }, select: { id: true } })
    if (tasks.length) {
        const ids = tasks.map((t) => t.id)
        await prisma.crmTaskTimer.deleteMany({ where: { taskId: { in: ids } } })
        await prisma.crmTask.deleteMany({ where: { id: { in: ids } } })
    }
    await prisma.crmMilestone.deleteMany({ where: { projectId: id } })
    await prisma.crmProject.delete({ where: { id } })
    return { success: true }
}

export async function addProjectNote(id, content) {
    const session = await requirePermission('projects', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const text = storeRich(content)
    if (!text) throw fail('Write the note first')
    await prisma.crmProjectNote.create({ data: { projectId: id, content: text, staffId: a.staffId } })
    return { success: true }
}

export async function deleteProjectNote(id, noteId) {
    const session = await requirePermission('projects', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const n = oid(noteId) && (await prisma.crmProjectNote.findFirst({ where: { id: noteId, projectId: id } }))
    if (!n) throw fail('Note not found', 404)
    if (n.staffId !== a.staffId && !a.can('delete')) throw fail('You can only delete your own notes', 403)
    await prisma.crmProjectNote.delete({ where: { id: noteId } })
    return { success: true }
}

const dayKey = (d) => new Date(d).toISOString().slice(0, 10)

/** Everything the projects home (the "project dashboard") shows, from the data the user may see. */
export async function projectDashboard() {
    const session = await requirePermission('projects', 'view')
    const a = await access(session)
    const where = await visible(a)
    const projects = await prisma.crmProject.findMany({ where })
    const ids = projects.map((p) => p.id)
    const today = new Date(new Date().toDateString())
    const overview = {
        ongoing: projects.filter((p) => p.status === 2).length,
        completed: projects.filter((p) => p.status === 4).length,
        upcoming: projects.filter((p) => p.status === 1).length,
        onHold: projects.filter((p) => p.status === 3).length,
        overdue: projects.filter((p) => [1, 2, 3].includes(p.status) && p.deadline && new Date(p.deadline) < today).length,
    }

    // schedule: active projects with their milestones
    const active = projects.filter((p) => [1, 2, 3].includes(p.status) && p.startDate).sort((x, y) => +new Date(x.deadline || x.startDate) - +new Date(y.deadline || y.startDate)).slice(0, 6)
    const stats = await taskStats(active.map((p) => p.id))
    const milestones = active.length ? await prisma.crmMilestone.findMany({ where: { projectId: { in: active.map((p) => p.id) } }, orderBy: { milestoneOrder: 'asc' } }) : []
    const schedule = []
    for (const [i, p] of active.entries()) {
        const start = new Date(p.startDate)
        let end = p.deadline ? new Date(p.deadline) : new Date(+start + 30 * 86400000)
        if (end <= start) end = new Date(+start + 86400000)
        schedule.push({ id: `p-${p.id}`, name: p.name, start, end, progress: progressOf(p, stats[p.id]), type: 'project', hideChildren: i > 1, displayOrder: schedule.length + 1, barVariant: p.status === 2 ? 'ongoing' : p.status === 3 ? 'hold' : 'upcoming', link: `/crm/projects/${p.id}` })
        for (const m of milestones.filter((x) => x.projectId === p.id)) {
            const mEnd = m.dueDate ? new Date(m.dueDate) : end
            schedule.push({ id: `m-${m.id}`, name: m.name, start, end: mEnd > start ? mEnd : new Date(+start + 86400000), progress: 0, type: 'task', project: `p-${p.id}`, displayOrder: schedule.length + 1, barVariant: 'milestone' })
        }
    }

    // tasks
    const { where: tw, staffId } = await (await import('@/lib/crm/tasksApi')).taskScope()
    let mine = { AND: [tw, { status: { not: 5 } }] }
    if (staffId) { const asg = await prisma.crmTaskAssigned.findMany({ where: { staffId }, select: { taskId: true } }); mine = { AND: [tw, { status: { not: 5 } }, { id: { in: asg.map((x) => x.taskId) } }] } }
    let cur0 = await prisma.crmTask.count({ where: mine })
    if (!cur0) mine = { AND: [tw, { status: { not: 5 } }] }
    const cur = await prisma.crmTask.findMany({ where: mine, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], take: 40, select: { id: true, name: true, dueDate: true, priority: true, status: true, relType: true, relId: true } })
    const sorted = [...cur.filter((t) => t.dueDate), ...cur.filter((t) => !t.dueDate)].slice(0, 7)
    const PR = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
    const currentTasks = sorted.map((t) => ({ id: t.id, name: t.name, dueDate: t.dueDate, priority: PR[t.priority] || '', overdue: !!t.dueDate && new Date(t.dueDate) < today, projectId: t.relType === 'project' ? t.relId : null }))

    // task overview: new vs finished, last 7 days and last 8 weeks
    const since = new Date(Date.now() - 8 * 7 * 86400000)
    const recentTasks = await prisma.crmTask.findMany({ where: { AND: [tw, { OR: [{ createdAt: { gte: since } }, { dateFinished: { gte: since } }] }] }, select: { createdAt: true, dateFinished: true, status: true } })
    const daily = { range: [], created: [], finished: [] }
    for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000), k = dayKey(d)
        daily.range.push(d.toLocaleDateString('en-GB', { weekday: 'short' }))
        daily.created.push(recentTasks.filter((t) => dayKey(t.createdAt) === k).length)
        daily.finished.push(recentTasks.filter((t) => t.dateFinished && dayKey(t.dateFinished) === k).length)
    }
    const weekly = { range: [], created: [], finished: [] }
    for (let i = 7; i >= 0; i--) {
        const to = new Date(Date.now() - i * 7 * 86400000 + 86400000), from = new Date(+to - 7 * 86400000)
        weekly.range.push(from.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }))
        weekly.created.push(recentTasks.filter((t) => t.createdAt >= from && t.createdAt < to).length)
        weekly.finished.push(recentTasks.filter((t) => t.dateFinished && t.dateFinished >= from && t.dateFinished < to).length)
    }
    const open = await prisma.crmTask.count({ where: { AND: [tw, { status: { not: 5 } }] } })

    // recent activity across projects
    const acts = ids.length ? await prisma.crmProjectActivity.findMany({ where: { projectId: { in: ids } }, orderBy: { createdAt: 'desc' }, take: 14 }) : []
    const people = await staffMap(acts.map((x) => x.staffId))
    const pName = Object.fromEntries(projects.map((p) => [p.id, p.name]))
    const recentActivity = acts.map((x) => ({ id: x.id, projectId: x.projectId, project: pName[x.projectId] || '', by: people[x.staffId]?.name || x.fullName || 'System', image: people[x.staffId]?.image || null, text: readable(x.descriptionKey, x.additionalData), date: x.createdAt }))
    return { overview, schedule, currentTasks, taskOverview: { daily, weekly, open }, recentActivity, can: { create: a.can('create') } }
}
