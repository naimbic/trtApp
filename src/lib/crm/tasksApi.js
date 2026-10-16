import { realPicture } from '@/lib/crm/pictures'
import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId, hasCap } from '@/lib/crm/permissions'

export const STATUS = { 1: 'Not started', 4: 'In progress', 3: 'Testing', 2: 'Awaiting feedback', 5: 'Complete' }
export const PRIORITY = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
const COMPLETE = 5

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const NONE = '000000000000000000000000'

async function access(session) {
    const authority = session.user.authority || []
    const scope = viewScope(authority, 'tasks')
    const staffId = await getStaffId(session)
    return { authority, scope, staffId, can: (cap) => hasCap(authority, 'tasks', cap) }
}

/** Who may change a task's status (finish it, reopen it, move it on the board): its assignees, whoever created it, and people who see all tasks. */
const mayAct = (a, t, assignees = t.assignees) => a.scope === 'all' || (!!a.staffId && (t.addedFrom === a.staffId || (assignees || []).some((x) => x.staffId === a.staffId)))
const NOT_YOURS = 'Only the people assigned to this task, or who created it, can change its status'

async function visibleWhere(a) {
    if (a.scope === 'all') return {}
    if (!a.staffId) return { id: NONE }
    const [asg, fol] = await Promise.all([
        prisma.crmTaskAssigned.findMany({ where: { staffId: a.staffId }, select: { taskId: true } }),
        prisma.crmTaskFollower.findMany({ where: { staffId: a.staffId }, select: { taskId: true } }),
    ])
    const ids = [...new Set([...asg, ...fol].map((x) => x.taskId))]
    return { OR: [{ id: { in: ids } }, { addedFrom: a.staffId }, { isPublic: true }] }
}

const staffName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'

async function staffMap(ids) {
    const list = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }) : []
    return Object.fromEntries(list.map((s) => [s.id, { id: s.id, name: staffName(s), image: realPicture(s.profileImage) }]))
}

/** Human label (and link) for what a task is attached to. */
async function relLabels(tasks) {
    const out = {}
    const by = {}
    for (const t of tasks) if (t.relType && oid(t.relId)) (by[t.relType] ||= new Set()).add(t.relId)
    const get = async (type, ids) => {
        const where = { id: { in: [...ids] } }
        if (type === 'customer') return (await prisma.crmClient.findMany({ where, select: { id: true, company: true } })).map((x) => [x.id, x.company, `/crm/clients/${x.id}`])
        if (type === 'lead') return (await prisma.crmLead.findMany({ where, select: { id: true, name: true, company: true } })).map((x) => [x.id, x.name || x.company, `/crm/leads/${x.id}`])
        if (type === 'project') return (await prisma.crmProject.findMany({ where, select: { id: true, name: true } })).map((x) => [x.id, x.name, `/crm/projects/${x.id}`])
        if (type === 'ticket') return (await prisma.crmTicket.findMany({ where, select: { id: true, subject: true } })).map((x) => [x.id, x.subject, `/crm/tickets/${x.id}`])
        return []
    }
    for (const [type, ids] of Object.entries(by)) for (const [id, label, href] of await get(type, ids)) out[`${type}:${id}`] = { label: label || type, href }
    return out
}

/** Tags, file counts and milestone names for a set of tasks (for the cards of the lists and the board). */
async function extras(tasks) {
    const ids = tasks.map((t) => t.id)
    const mids = [...new Set(tasks.map((t) => t.milestoneId).filter(Boolean))]
    const [tg, files, ms] = await Promise.all([
        ids.length ? prisma.crmTaggable.findMany({ where: { relType: 'task', relId: { in: ids } }, include: { tag: true }, orderBy: { tagOrder: 'asc' } }) : [],
        ids.length ? prisma.crmMedia.groupBy({ by: ['relId'], where: { relType: 'task', relId: { in: ids }, isFolder: false }, _count: { _all: true } }).catch(() => []) : [],
        mids.length ? prisma.crmMilestone.findMany({ where: { id: { in: mids } }, select: { id: true, name: true } }) : [],
    ])
    const tags = {}, fileCount = {}, milestones = Object.fromEntries(ms.map((m) => [m.id, m.name]))
    for (const x of tg) (tags[x.relId] ||= []).push(x.tag.name)
    for (const f of files) fileCount[f.relId] = f._count._all
    return (t) => ({ tags: tags[t.id] || [], files: fileCount[t.id] || 0, milestone: t.milestoneId ? { id: t.milestoneId, name: milestones[t.milestoneId] || '' } : null })
}

function card(t, people, rels, extra = {}) {
    const rel = t.relType && t.relId ? rels[`${t.relType}:${t.relId}`] : null
    return {
        id: t.id, name: t.name, status: t.status, statusLabel: STATUS[t.status] || '', priority: t.priority, priorityLabel: PRIORITY[t.priority] || '',
        startDate: t.startDate, dueDate: t.dueDate, dateFinished: t.dateFinished, relType: t.relType, relId: t.relId,
        rel: rel ? { type: t.relType, ...rel } : t.relType ? { type: t.relType, label: t.relType } : null,
        assignees: (t.assignees || []).map((x) => people[x.staffId]).filter(Boolean),
        checklistDone: (t.checklistItems || []).filter((c) => c.finished).length, checklistTotal: (t.checklistItems || []).length,
        comments: t._count?.comments ?? 0, milestoneId: t.milestoneId || null, code: `#T-${t.legacyId ?? String(t.id).slice(-5).toUpperCase()}`, billable: t.billable, recurring: t.recurring, order: t.kanbanOrder, createdAt: t.createdAt,
        ...extra,
    }
}

export async function listTasks(p = {}) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    const and = [await visibleWhere(a)]
    if (p.mine === '1' && a.staffId) {
        const asg = await prisma.crmTaskAssigned.findMany({ where: { staffId: a.staffId }, select: { taskId: true } })
        and.push({ id: { in: asg.map((x) => x.taskId) } })
    }
    if (oid(p.assignee)) and.push({ id: { in: (await prisma.crmTaskAssigned.findMany({ where: { staffId: p.assignee }, select: { taskId: true } })).map((x) => x.taskId) } })
    if (p.priority) and.push({ priority: parseInt(p.priority, 10) })
    if (p.relType) and.push({ relType: p.relType })
    if (oid(p.relId)) and.push({ relId: p.relId })
    if (p.query) and.push({ OR: [{ name: { contains: p.query, mode: 'insensitive' } }, { description: { contains: p.query, mode: 'insensitive' } }] })
    // finished tasks are hidden on the board unless asked for, like Perfex
    const showDone = p.done === '1' || p.status === '5'
    if (p.status) and.push({ status: parseInt(p.status, 10) })
    else if (!showDone) and.push({ OR: [{ status: { not: COMPLETE } }, { dateFinished: { gte: new Date(Date.now() - 14 * 86400000) } }] })
    const limit = Math.min(parseInt(p.limit, 10) || 400, 1000)
    const tasks = await prisma.crmTask.findMany({
        where: { AND: and }, take: limit, orderBy: [{ kanbanOrder: 'asc' }, { createdAt: 'desc' }],
        include: { assignees: { select: { staffId: true } }, checklistItems: { select: { finished: true } }, _count: { select: { comments: true } } },
    })
    const people = await staffMap(tasks.flatMap((t) => t.assignees.map((x) => x.staffId)))
    const rels = await relLabels(tasks)
    const counts = {}
    for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1
    const ex = await extras(tasks)
    return { list: tasks.map((t) => card(t, people, rels, { ...ex(t), canFinish: mayAct(a, t) })), counts, can: { create: a.can('create'), edit: a.can('edit'), delete: a.can('delete') } }
}

async function loadOne(id, a) {
    if (!oid(id)) throw fail('Task not found', 404)
    const t = await prisma.crmTask.findFirst({ where: { AND: [{ id }, await visibleWhere(a)] }, include: { assignees: true, followers: true, comments: { orderBy: { createdAt: 'asc' } }, checklistItems: { orderBy: { listOrder: 'asc' } }, timers: { orderBy: { createdAt: 'desc' } } } })
    if (!t) throw fail('Task not found', 404)
    return t
}

export async function getTask(id) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    const t = await loadOne(id, a)
    const ids = [...t.assignees.map((x) => x.staffId), ...t.followers.map((x) => x.staffId), ...t.comments.map((c) => c.staffId).filter(Boolean), ...t.timers.map((x) => x.staffId).filter(Boolean), t.addedFrom].filter(Boolean)
    const people = await staffMap(ids)
    const rels = await relLabels([t])
    const now = Date.now()
    const timers = t.timers.map((x) => ({ id: x.id, staff: people[x.staffId] || null, startTime: x.startTime, endTime: x.endTime, note: x.note, seconds: Math.max(0, Math.round(((x.endTime ? +x.endTime : now) - +(x.startTime || now)) / 1000)) }))
    const running = timers.find((x) => !x.endTime && x.staff?.id === a.staffId) || null
    return {
        task: {
            ...card({ ...t, checklistItems: t.checklistItems, _count: { comments: t.comments.length } }, people, rels, { ...(await extras([t]))(t), canFinish: mayAct(a, t) }),
            description: t.description || '', hourlyRate: t.hourlyRate, isPublic: t.isPublic, visibleToClient: t.visibleToClient, billed: t.billed,
            recurringType: t.recurringType, repeatEvery: t.repeatEvery, totalCycles: t.totalCycles, addedBy: people[t.addedFrom] || null,
            followers: t.followers.map((x) => people[x.staffId]).filter(Boolean),
            assigneeIds: t.assignees.map((x) => x.staffId), followerIds: t.followers.map((x) => x.staffId),
        },
        checklist: t.checklistItems.map((c) => ({ id: c.id, description: c.description || '', finished: c.finished })),
        comments: t.comments.map((c) => ({ id: c.id, content: c.content || '', staff: people[c.staffId] || null, fromClient: !!c.contactId, createdAt: c.createdAt, mine: !!a.staffId && c.staffId === a.staffId })),
        timers, running, totalSeconds: timers.reduce((s, x) => s + x.seconds, 0),
        // what happened on the task, newest first (for the activity panel)
        activity: [
            { type: 'created', staff: people[t.addedFrom] || null, at: t.createdAt },
            ...(t.dateFinished && t.status === COMPLETE ? [{ type: 'finished', staff: null, at: t.dateFinished }] : []),
            ...t.comments.map((c) => ({ type: 'comment', staff: people[c.staffId] || null, at: c.createdAt, text: (c.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) })),
            ...t.timers.filter((x) => x.endTime).map((x) => ({ type: 'timer', staff: people[x.staffId] || null, at: x.endTime, seconds: Math.max(0, Math.round((+x.endTime - +(x.startTime || x.endTime)) / 1000)), text: x.note || '' })),
            ...t.checklistItems.filter((c) => c.finished).map((c) => ({ type: 'checklist', staff: null, at: c.updatedAt || t.updatedAt, text: c.description || '' })),
        ].sort((x, y) => +new Date(y.at) - +new Date(x.at)).slice(0, 60),
        milestones: t.relType === 'project' && oid(t.relId) ? (await prisma.crmMilestone.findMany({ where: { projectId: t.relId }, orderBy: { milestoneOrder: 'asc' }, select: { id: true, name: true } })) : [],
        can: { edit: a.can('edit'), delete: a.can('delete') },
    }
}

const dateOrNull = (v) => (v ? new Date(v) : null)

export async function saveTask(body, id) {
    const session = await requirePermission('tasks', id ? 'edit' : 'create')
    const a = await access(session)
    const name = String(body.name || '').trim()
    if (!name) throw fail('Give the task a name')
    const prio = [1, 2, 3, 4].includes(+body.priority) ? +body.priority : 2
    const status = [1, 2, 3, 4, 5].includes(+body.status) ? +body.status : 1
    if (body.startDate && body.dueDate && new Date(body.dueDate) < new Date(body.startDate)) throw fail('Due date cannot be before the start date')
    const data = {
        name, description: body.description ?? null, priority: prio, status,
        startDate: dateOrNull(body.startDate), dueDate: dateOrNull(body.dueDate),
        relType: body.relType || null, relId: oid(body.relId), milestoneId: oid(body.milestoneId),
        isPublic: !!body.isPublic, billable: !!body.billable, visibleToClient: !!body.visibleToClient, hourlyRate: Number(body.hourlyRate) || 0,
        recurring: !!body.recurring, recurringType: body.recurring ? body.recurringType || 'month' : null, repeatEvery: body.recurring ? Math.max(parseInt(body.repeatEvery, 10) || 1, 1) : 0, totalCycles: body.recurring ? Math.max(parseInt(body.totalCycles, 10) || 0, 0) : 0,
    }
    let prev = null
    if (id) { prev = await loadOne(id, a); if (status !== prev.status && !mayAct(a, prev)) throw fail(NOT_YOURS, 403); data.dateFinished = status === COMPLETE ? prev.dateFinished || new Date() : null }
    else data.dateFinished = status === COMPLETE ? new Date() : null
    const task = id
        ? await prisma.crmTask.update({ where: { id }, data })
        : await prisma.crmTask.create({ data: { ...data, addedFrom: a.staffId, startDate: data.startDate || new Date() } })
    const sync = async (model, ids, extra = {}) => {
        const want = [...new Set((ids || []).map(oid).filter(Boolean))]
        const have = await prisma[model].findMany({ where: { taskId: task.id }, select: { id: true, staffId: true } })
        const drop = have.filter((h) => !want.includes(h.staffId)).map((h) => h.id)
        if (drop.length) await prisma[model].deleteMany({ where: { id: { in: drop } } })
        const add = want.filter((w) => !have.some((h) => h.staffId === w))
        for (const staffId of add) await prisma[model].create({ data: { taskId: task.id, staffId, ...extra } })
    }
    if (Array.isArray(body.assigneeIds)) await sync('crmTaskAssigned', body.assigneeIds, { assignedFrom: a.staffId })
    if (Array.isArray(body.followerIds)) await sync('crmTaskFollower', body.followerIds)
    if (Array.isArray(body.tags)) {
        const want = [...new Set(body.tags.map((x) => String(x || '').trim().slice(0, 40)).filter(Boolean))].slice(0, 12)
        await prisma.crmTaggable.deleteMany({ where: { relType: 'task', relId: task.id } })
        for (const [i, name] of want.entries()) {
            const tag = (await prisma.crmTag.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) || (await prisma.crmTag.create({ data: { name } }))
            await prisma.crmTaggable.create({ data: { relType: 'task', relId: task.id, tagId: tag.id, tagOrder: i } })
        }
    }
    return { success: true, id: task.id }
}

export async function moveTask(id, { status, order }) {
    const session = await requirePermission('tasks', 'edit')
    const a = await access(session)
    const t = await loadOne(id, a)
    const st = [1, 2, 3, 4, 5].includes(+status) ? +status : t.status
    if (st !== t.status && !mayAct(a, t)) throw fail(NOT_YOURS, 403)
    await prisma.crmTask.update({ where: { id }, data: { status: st, kanbanOrder: Number.isFinite(+order) ? Math.round(+order) : t.kanbanOrder, dateFinished: st === COMPLETE ? t.dateFinished || new Date() : null } })
    return { success: true }
}

/** Persist a whole column order after a drop (ids in display order). */
export async function reorderTasks(status, ids) {
    const session = await requirePermission('tasks', 'edit')
    const a = await access(session)
    const st = [1, 2, 3, 4, 5].includes(+status) ? +status : null
    if (!st || !Array.isArray(ids)) throw fail('Bad request')
    const where = await visibleWhere(a)
    let denied = 0
    for (const [i, id] of ids.filter(oid).entries()) {
        const t = await prisma.crmTask.findFirst({ where: { AND: [{ id }, where] }, select: { status: true, dateFinished: true, addedFrom: true, assignees: { select: { staffId: true } } } })
        if (!t) continue
        if (t.status !== st && !mayAct(a, t)) { denied++; continue }
        await prisma.crmTask.update({ where: { id }, data: { kanbanOrder: i, ...(t.status !== st ? { status: st, dateFinished: st === COMPLETE ? new Date() : null } : {}) } })
    }
    if (denied && denied === ids.filter(oid).length) throw fail(NOT_YOURS, 403)
    return { success: true, denied }
}

/** Drag and drop on the task lists: optionally move a task to another project / group, then store the order of `ids`. */
export async function regroupTask({ id, relType, relId, ids, ...rest }) {
    const session = await requirePermission('tasks', 'edit')
    const a = await access(session)
    const where = await visibleWhere(a)
    if (oid(id)) {
        const t = await prisma.crmTask.findFirst({ where: { AND: [{ id }, where] }, select: { id: true } })
        if (!t) throw fail('Task not found', 404)
        if (relType === 'project' && oid(relId)) await prisma.crmTask.update({ where: { id }, data: { relType: 'project', relId } })
        else if (relType === null || relType === 'none') await prisma.crmTask.update({ where: { id }, data: { relType: null, relId: null } })
        if ('milestoneId' in rest) await prisma.crmTask.update({ where: { id }, data: { milestoneId: oid(rest.milestoneId) } })
    }
    for (const [i, tid] of (Array.isArray(ids) ? ids : []).filter(oid).entries()) {
        await prisma.crmTask.updateMany({ where: { AND: [{ id: tid }, where] }, data: { kanbanOrder: i } })
    }
    return { success: true }
}

export async function deleteTask(id) {
    const session = await requirePermission('tasks', 'delete')
    const a = await access(session)
    await loadOne(id, a)
    await prisma.crmTaskTimer.deleteMany({ where: { taskId: id } })
    await prisma.crmTask.delete({ where: { id } })
    return { success: true }
}

export async function addComment(id, content) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const text = String(content || '').trim().slice(0, 5000)
    if (!text) throw fail('Write a comment first')
    await prisma.crmTaskComment.create({ data: { taskId: id, content: text, staffId: a.staffId } })
    return { success: true }
}

export async function deleteComment(id, commentId) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const c = oid(commentId) && (await prisma.crmTaskComment.findFirst({ where: { id: commentId, taskId: id } }))
    if (!c) throw fail('Comment not found', 404)
    if (c.staffId !== a.staffId && !a.can('delete')) throw fail('You can only delete your own comments', 403)
    await prisma.crmTaskComment.delete({ where: { id: commentId } })
    return { success: true }
}

export async function checklist(id, op) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    await loadOne(id, a)
    if (op.action === 'add') {
        const description = String(op.description || '').trim().slice(0, 500)
        if (!description) throw fail('Write the item first')
        const last = await prisma.crmTaskChecklistItem.findFirst({ where: { taskId: id }, orderBy: { listOrder: 'desc' }, select: { listOrder: true } })
        await prisma.crmTaskChecklistItem.create({ data: { taskId: id, description, listOrder: (last?.listOrder ?? 0) + 1, addedFrom: a.staffId, finished: false } })
    } else {
        const item = oid(op.itemId) && (await prisma.crmTaskChecklistItem.findFirst({ where: { id: op.itemId, taskId: id } }))
        if (!item) throw fail('Item not found', 404)
        if (op.action === 'toggle') await prisma.crmTaskChecklistItem.update({ where: { id: item.id }, data: { finished: !!op.finished, finishedFrom: op.finished ? a.staffId : null } })
        else if (op.action === 'delete') await prisma.crmTaskChecklistItem.delete({ where: { id: item.id } })
        else throw fail('Unknown action')
    }
    return { success: true }
}

export async function timer(id, op) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    const t = await loadOne(id, a)
    if (!a.staffId) throw fail('Your login is not linked to a staff member')
    const open = await prisma.crmTaskTimer.findFirst({ where: { taskId: id, staffId: a.staffId, endTime: null } })
    if (op.action === 'start') {
        if (open) throw fail('Timer already running')
        if (t.status === COMPLETE) throw fail('This task is complete')
        await prisma.crmTaskTimer.create({ data: { taskId: id, staffId: a.staffId, startTime: new Date(), endTime: null, hourlyRate: t.hourlyRate || 0 } })
        if (t.status === 1) await prisma.crmTask.update({ where: { id }, data: { status: 4 } })
    } else if (op.action === 'stop') {
        if (!open) throw fail('No timer running')
        await prisma.crmTaskTimer.update({ where: { id: open.id }, data: { endTime: new Date(), note: String(op.note || '').slice(0, 500) || null } })
    } else if (op.action === 'delete') {
        const x = oid(op.timerId) && (await prisma.crmTaskTimer.findFirst({ where: { id: op.timerId, taskId: id } }))
        if (!x) throw fail('Entry not found', 404)
        if (x.staffId !== a.staffId && !a.can('delete_timesheet')) throw fail('Forbidden', 403)
        await prisma.crmTaskTimer.delete({ where: { id: x.id } })
    } else throw fail('Unknown action')
    return { success: true }
}

export async function taskLookups() {
    const session = await requirePermission('tasks', 'view')
    const [staff, milestones] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }),
        prisma.crmMilestone.findMany({ select: { id: true, name: true }, take: 500 }),
    ])
    return { staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })).sort((x, y) => x.name.localeCompare(y.name)), milestones, me: await getStaffId(session) }
}

/** Prisma `where` limiting tasks to what the signed-in staff member may see (for dashboards). */
export async function taskScope() {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    return { where: await visibleWhere(a), staffId: a.staffId }
}
