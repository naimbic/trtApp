import { leadLabel } from '@/lib/crm/leadLabel'
import { realPicture } from '@/lib/crm/pictures'
import { getTaskStatuses, defaultTaskStatus } from '@/lib/crm/taskStatuses'
import { readSettings } from '@/lib/crm/appSettings'
import prisma from '@/lib/prisma'
import { logTask, logLead, namesOf } from '@/lib/crm/activity'
import { emit } from '@/lib/crm/webhooks'
import { notifyComment, notifyNewMentions, notifyMentions } from '@/lib/crm/mentionsApi'
import { notifyNotice } from '@/lib/crm/notifyMail'
import { storeRich, plainText } from '@/lib/crm/richText'
import { requirePermission, viewScope, getStaffId, hasCap } from '@/lib/crm/permissions'

export const STATUS = { 1: 'Not started', 4: 'In progress', 3: 'Testing', 2: 'Awaiting feedback', 5: 'Complete' }
export const PRIORITY = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
const COMPLETE = 5

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const NONE = '000000000000000000000000'

/** The codes of every task status (the five that come with the app plus the ones added in Settings). */
async function statusCodes() { return new Set((await getTaskStatuses()).map((x) => x.value)) }

async function access(session) {
    const authority = session.user.authority || []
    const scope = viewScope(authority, 'tasks')
    const staffId = await getStaffId(session)
    return { authority, scope, staffId, can: (cap) => hasCap(authority, 'tasks', cap) }
}

/** Who may change a task's status (finish it, reopen it, move it on the board): its assignees, whoever created it, and people who see all tasks. */
const mayAct = (a, t, assignees = t.assignees) => a.scope === 'all' || (!!a.staffId && (t.addedFrom === a.staffId || (assignees || []).some((x) => x.staffId === a.staffId)))
const NOT_YOURS = 'Only the people assigned to this task, or who created it, can change it'

/** Everybody who may open the tasks sees all of them; changing one is limited by mayAct. */
async function visibleWhere() { return {} }

/** The narrow view (own tasks, followed, created, public) used by the dashboards' own figures. */
async function ownWhere(a) {
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
        if (type === 'lead') return (await prisma.crmLead.findMany({ where, select: { id: true, name: true, company: true } })).map((x) => [x.id, leadLabel(x), `/crm/leads/${x.id}`])
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
    const parentIds = [...new Set(tasks.map((t) => t.parentId).filter(Boolean))]
    const [kids, parents] = await Promise.all([
        ids.length ? prisma.crmTask.findMany({ where: { parentId: { in: ids } }, select: { parentId: true, status: true } }) : [],
        parentIds.length ? prisma.crmTask.findMany({ where: { id: { in: parentIds } }, select: { id: true, name: true } }) : [],
    ])
    const sub = {}
    for (const k of kids) { const x = (sub[k.parentId] ||= { done: 0, total: 0 }); x.total++; if (k.status === COMPLETE) x.done++ }
    const parentName = Object.fromEntries(parents.map((x) => [x.id, x.name]))
    const [tg, files, ms] = await Promise.all([
        ids.length ? prisma.crmTaggable.findMany({ where: { relType: 'task', relId: { in: ids } }, include: { tag: true }, orderBy: { tagOrder: 'asc' } }) : [],
        ids.length ? prisma.crmMedia.groupBy({ by: ['relId'], where: { relType: 'task', relId: { in: ids }, isFolder: false }, _count: { _all: true } }).catch(() => []) : [],
        mids.length ? prisma.crmMilestone.findMany({ where: { id: { in: mids } }, select: { id: true, name: true } }) : [],
    ])
    const tags = {}, fileCount = {}, milestones = Object.fromEntries(ms.map((m) => [m.id, m.name]))
    for (const x of tg) (tags[x.relId] ||= []).push(x.tag.name)
    for (const f of files) fileCount[f.relId] = f._count._all
    return (t) => ({ subtasks: sub[t.id] || { done: 0, total: 0 }, parent: t.parentId && parentName[t.parentId] ? { id: t.parentId, name: parentName[t.parentId] } : null, tags: tags[t.id] || [], files: fileCount[t.id] || 0, milestone: t.milestoneId ? { id: t.milestoneId, name: milestones[t.milestoneId] || '' } : null })
}

function card(t, people, rels, extra = {}) {
    const rel = t.relType && t.relId ? rels[`${t.relType}:${t.relId}`] : null
    return {
        id: t.id, name: t.name, status: t.status, statusLabel: STATUS[t.status] || '', priority: t.priority, priorityLabel: PRIORITY[t.priority] || '',
        startDate: t.startDate, dueDate: t.dueDate, hours: t.hours ?? null, dateFinished: t.dateFinished, relType: t.relType, relId: t.relId, parentId: t.parentId || null,
        rel: rel ? { type: t.relType, ...rel } : t.relType ? { type: t.relType, label: t.relType } : null,
        assignees: (t.assignees || []).map((x) => people[x.staffId]).filter(Boolean),
        checklistDone: (t.checklistItems || []).filter((c) => c.finished).length, checklistTotal: (t.checklistItems || []).length,
        comments: t._count?.comments ?? 0, milestoneId: t.milestoneId || null, code: `#T-${t.legacyId ?? String(t.id).slice(-5).toUpperCase()}`, billable: t.billable, visibleToClient: !!t.visibleToClient, recurring: t.recurring, order: t.kanbanOrder, createdAt: t.createdAt,
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
    // one lead, or one client (its own tasks, the tasks of its projects and of the lead it came from)
    if (oid(p.leadId)) and.push({ relType: 'lead', relId: p.leadId })
    if (oid(p.clientId)) {
        const [projects, leads] = await Promise.all([
            prisma.crmProject.findMany({ where: { clientId: p.clientId }, select: { id: true } }),
            prisma.crmLead.findMany({ where: { clientId: p.clientId }, select: { id: true } }),
        ])
        and.push({ OR: [{ relType: 'customer', relId: p.clientId }, { relType: 'project', relId: { in: projects.map((x) => x.id) } }, { relType: 'lead', relId: { in: leads.map((x) => x.id) } }] })
    }
    if (p.clientVisible === '1') and.push({ visibleToClient: true })
    if (p.relType) and.push({ relType: p.relType })
    if (oid(p.relId)) and.push({ relId: p.relId })
    if (p.query) and.push({ OR: [{ name: { contains: p.query, mode: 'insensitive' } }, { description: { contains: p.query, mode: 'insensitive' } }] })
    // date filters: a range on the due / start / completion date, only the late ones, or the ones without a date.
    // Days are whole days (UTC), the caller says what "today" is where it lives.
    const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? new Date(`${v}T00:00:00.000Z`) : null)
    const field = { dueDate: 'dueDate', startDate: 'startDate', dateFinished: 'dateFinished' }[p.dateField] || 'dueDate'
    const from = day(p.from), to = day(p.to)
    if (from || to) and.push({ AND: [{ [field]: { not: null } }, { [field]: { ...(from ? { gte: from } : {}), ...(to ? { lt: new Date(+to + 86400000) } : {}) } }] })
    if (p.noDate === '1') and.push({ [field]: null })
    const valid = await statusCodes()
    const statuses = String(p.statuses || '').split(',').map((x) => parseInt(x, 10)).filter((x) => valid.has(x))
    if (statuses.length) and.push({ status: { in: statuses } })
    if (p.unassigned === '1') and.push({ assignees: { none: {} }, status: { not: COMPLETE } })
    if (p.overdue === '1') and.push({ AND: [{ dueDate: { not: null } }, { dueDate: { lt: day(p.today) || day(new Date().toISOString().slice(0, 10)) } }], status: { not: COMPLETE } })
    // finished tasks are hidden unless asked for (the Show completed switch), like Perfex; a date range or a status filter on Complete shows them too (a day's work includes what is done)
    const showDone = p.done === '1' || p.status === '5' || !!(from || to) || statuses.includes(5)
    if (p.status) and.push({ status: parseInt(p.status, 10) })
    else if (!showDone) and.push({ status: { not: COMPLETE } })
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
    return { list: tasks.map((t) => card(t, people, rels, { ...ex(t), canFinish: mayAct(a, t), assignedToMe: !!a.staffId && (t.assignees || []).some((x) => x.staffId === a.staffId) })), counts, can: { create: a.can('create'), edit: a.can('edit'), delete: a.can('delete') } }
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
    const logs = await prisma.crmTaskActivity.findMany({ where: { taskId: id }, orderBy: { createdAt: 'desc' }, take: 120 })
    const ids = [...logs.map((l) => l.staffId).filter(Boolean), ...t.assignees.map((x) => x.staffId), ...t.followers.map((x) => x.staffId), ...t.comments.map((c) => c.staffId).filter(Boolean), ...t.comments.flatMap((c) => Object.values(c.reactions && typeof c.reactions === 'object' ? c.reactions : {}).flat()), ...t.timers.map((x) => x.staffId).filter(Boolean), ...t.checklistItems.flatMap(stepPeople), t.addedFrom].filter(Boolean)
    const people = await staffMap(ids)
    const cIds = [...new Set(t.comments.map((c) => c.contactId).filter(Boolean))]
    const contactName = Object.fromEntries((cIds.length ? await prisma.crmContact.findMany({ where: { id: { in: cIds } }, select: { id: true, firstName: true, lastName: true, email: true } }) : []).map((c) => [c.id, [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '']))
    const rels = await relLabels([t])
    const now = Date.now()
    const timers = t.timers.map((x) => ({ id: x.id, staff: people[x.staffId] || null, startTime: x.startTime, endTime: x.endTime, note: x.note, seconds: Math.max(0, Math.round(((x.endTime ? +x.endTime : now) - +(x.startTime || now)) / 1000)) }))
    const running = timers.find((x) => !x.endTime && x.staff?.id === a.staffId) || null
    return {
        task: {
            ...card({ ...t, checklistItems: t.checklistItems, _count: { comments: t.comments.length } }, people, rels, { ...(await extras([t]))(t), canFinish: mayAct(a, t), assignedToMe: !!a.staffId && (t.assignees || []).some((x) => x.staffId === a.staffId) }),
            description: t.description || '', hourlyRate: t.hourlyRate, isPublic: t.isPublic, visibleToClient: t.visibleToClient, billed: t.billed,
            recurringType: t.recurringType, repeatEvery: t.repeatEvery, totalCycles: t.totalCycles, addedBy: people[t.addedFrom] || null,
            followers: t.followers.map((x) => people[x.staffId]).filter(Boolean),
            assigneeIds: t.assignees.map((x) => x.staffId), followerIds: t.followers.map((x) => x.staffId),
        },
        checklist: [...t.checklistItems].sort((x, y) => (x.listOrder || 0) - (y.listOrder || 0)).map((c) => ({ id: c.id, description: c.description || '', finished: c.finished, assigned: c.assigned || null, assignedIds: stepPeople(c), people: stepPeople(c).map((i) => people[i]).filter(Boolean), person: people[c.assigned] || null, dueDate: c.dueDate || null, hours: c.hours ?? null, reminder: c.reminder ?? null, order: c.listOrder || 0 })),
        comments: t.comments.map((c) => {
            const to = c.replyToId ? t.comments.find((x) => x.id === c.replyToId) : null
            return { id: c.id, content: c.content || '', staff: people[c.staffId] || null, fromClient: !!c.contactId, clientName: c.contactId ? contactName[c.contactId] || '' : '', createdAt: c.createdAt, edited: +new Date(c.updatedAt) - +new Date(c.createdAt) > 2000, mine: !!a.staffId && c.staffId === a.staffId, canDelete: (!!a.staffId && c.staffId === a.staffId) || a.can('delete'),
                replyToId: c.replyToId || null, toClient: !!c.toClient,
                reactions: Object.entries(c.reactions && typeof c.reactions === 'object' ? c.reactions : {}).map(([emoji, ids]) => ({ emoji, count: ids.length, mine: !!a.staffId && ids.includes(a.staffId), names: ids.filter((i) => i !== a.staffId).map((i) => people[i]?.name).filter(Boolean) })).filter((r) => r.count),
                replyTo: to ? { id: to.id, name: people[to.staffId]?.name || (to.contactId ? 'Client' : ''), text: String(to.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) } : null }
        }),
        timers, running, totalSeconds: timers.reduce((s, x) => s + x.seconds, 0),
        // what happened on the task, newest first (for the activity panel)
        activity: [
            ...logs.map((l) => ({ type: l.kind, staff: people[l.staffId] || null, at: l.createdAt, text: l.text })),
            ...(logs.some((l) => l.kind === 'created') ? [] : [{ type: 'created', staff: people[t.addedFrom] || null, at: t.createdAt, text: 'Task created' }]),
            ...t.comments.map((c) => ({ type: 'comment', staff: people[c.staffId] || null, at: c.createdAt, text: (c.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) })),
            ...t.timers.filter((x) => x.endTime).map((x) => ({ type: 'timer', staff: people[x.staffId] || null, at: x.endTime, seconds: Math.max(0, Math.round((+x.endTime - +(x.startTime || x.endTime)) / 1000)), text: x.note || '' })),
        ].sort((x, y) => +new Date(y.at) - +new Date(x.at)).slice(0, 100),
        parent: t.parentId ? await prisma.crmTask.findUnique({ where: { id: t.parentId }, select: { id: true, name: true } }) : null,
        subtasks: await (async () => {
            const kids = await prisma.crmTask.findMany({ where: { parentId: id }, orderBy: [{ kanbanOrder: 'asc' }, { createdAt: 'asc' }], include: { assignees: { select: { staffId: true } } } })
            const pm = await staffMap(kids.flatMap((k) => k.assignees.map((x) => x.staffId)))
            return kids.map((k) => ({ id: k.id, name: k.name, status: k.status, dueDate: k.dueDate, priority: k.priority, assignees: k.assignees.map((x) => pm[x.staffId]).filter(Boolean), canFinish: mayAct(a, k) }))
        })(),
        milestones: t.relType === 'project' && oid(t.relId) ? (await prisma.crmMilestone.findMany({ where: { projectId: t.relId }, orderBy: { milestoneOrder: 'asc' }, select: { id: true, name: true } })) : [],
        can: { edit: a.can('edit') && mayAct(a, t), delete: a.can('delete') && mayAct(a, t) },
    }
}

const dateOrNull = (v) => (v ? new Date(v) : null)
/** Hours a task or a step takes: a number from 0.25 to 999, or nothing. */
const hoursOrNull = (v) => { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) || n <= 0 ? null : Math.min(999, Math.round(n * 100) / 100) }

const PRIORITY_NAME = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : 'none')
/** Writes what changed on a task into its activity (and into the lead it is linked to). `prev` is null for a new task. */
async function trackTask({ task, prev, a, assigneeIds }) {
    const by = a.staffId
    const lead = (txt) => (task.relType === 'lead' && oid(task.relId) ? logLead(task.relId, by, `Task “${task.name}”: ${txt}`) : null)
    if (!prev) {
        await logTask(task.id, by, 'created', 'Task created'); await lead('created')
        const who = Array.isArray(assigneeIds) ? [...new Set(assigneeIds.map(oid).filter(Boolean))] : []
        if (who.length) { const t = `Assigned to ${await namesOf(who)}`; await logTask(task.id, by, 'people', t); await lead(t) }
        return
    }
    const st = await getTaskStatuses()
    const label = (v) => st.find((x) => x.value === v)?.name || String(v)
    const log = async (kind, text, toLead = true) => { await logTask(task.id, by, kind, text); if (toLead) await lead(text) }
    if (prev.status !== task.status) await log(task.status === COMPLETE ? 'finished' : 'status', `Status changed from ${label(prev.status)} to ${label(task.status)}`)
    if (prev.priority !== task.priority) await log('priority', `Priority changed from ${PRIORITY_NAME[prev.priority] || prev.priority} to ${PRIORITY_NAME[task.priority] || task.priority}`, false)
    if (day(prev.dueDate) !== day(task.dueDate)) await log('dates', `Due date changed from ${day(prev.dueDate)} to ${day(task.dueDate)}`)
    if (day(prev.startDate) !== day(task.startDate)) await log('dates', `Start date changed from ${day(prev.startDate)} to ${day(task.startDate)}`, false)
    if (prev.name !== task.name) await log('edit', `Renamed from “${prev.name}” to “${task.name}”`, false)
    if ((prev.relType || '') !== (task.relType || '') || (prev.relId || '') !== (task.relId || '')) await log('relation', 'Related record changed', false)
    if (Array.isArray(assigneeIds)) {
        const before = prev.assignees.map((x) => x.staffId), now = [...new Set(assigneeIds.map(oid).filter(Boolean))]
        const added = now.filter((x) => !before.includes(x)), removed = before.filter((x) => !now.includes(x))
        if (added.length) await log('people', `Assigned to ${await namesOf(added)}`)
        if (removed.length) await log('people', `No longer assigned: ${await namesOf(removed)}`)
    }
}

export async function saveTask(body, id) {
    const session = await requirePermission('tasks', id ? 'edit' : 'create')
    const a = await access(session)
    const name = String(body.name || '').trim()
    if (!name) throw fail('Give the task a name')
    // platform defaults for a new task (Settings → Tasks); an explicit value always wins
    const S = id ? null : await readSettings(NEW_TASK_KEYS)
    const prio = [1, 2, 3, 4].includes(+body.priority) ? +body.priority : [1, 2, 3, 4].includes(S?.num('default_task_priority')) ? S.num('default_task_priority') : 2
    const valid = await statusCodes()
    const status = valid.has(+body.status) ? +body.status : await defaultTaskStatus()
    const data = {
        name, description: storeRich(body.description), priority: prio, status,
        startDate: dateOrNull(body.startDate), dueDate: dateOrNull(body.dueDate), hours: hoursOrNull(body.hours),
        relType: body.relType || null, relId: oid(body.relId), milestoneId: oid(body.milestoneId),
        isPublic: !!body.isPublic, billable: body.billable === undefined && S ? S.on('task_biillable_checked_on_creation') : !!body.billable, visibleToClient: !!body.visibleToClient, hourlyRate: Number(body.hourlyRate) || 0,
        recurring: !!body.recurring, recurringType: body.recurring ? body.recurringType || 'month' : null, repeatEvery: body.recurring ? Math.max(parseInt(body.repeatEvery, 10) || 1, 1) : 0, totalCycles: body.recurring ? Math.max(parseInt(body.totalCycles, 10) || 0, 0) : 0,
    }
    // a subtask: its parent must exist and cannot be the task itself or one of its own subtasks
    if (body.parentId !== undefined) {
        const pid = oid(body.parentId)
        if (pid) {
            if (id && (pid === id || (await descendants(id)).includes(pid))) throw fail('A task cannot be a subtask of itself')
            const parent = await prisma.crmTask.findUnique({ where: { id: pid }, select: { relType: true, relId: true, milestoneId: true, addedFrom: true, assignees: { select: { staffId: true } } } })
            if (!parent) throw fail('Parent task not found', 404)
            if (!mayAct(a, parent)) throw fail(NOT_YOURS, 403) // only the team of a task adds subtasks to it
            if (!id) Object.assign(data, { relType: data.relType || parent.relType, relId: data.relId || parent.relId, milestoneId: data.milestoneId || parent.milestoneId })
        }
        data.parentId = pid
    }
    let prev = null
    if (id) { prev = await loadOne(id, a); if (!mayAct(a, prev)) throw fail(NOT_YOURS, 403);
        // an existing task whose dates are already out of order (a task added "now" with an earlier due date) can still be saved for other reasons, e.g. giving it to someone
        const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null)
        const unchanged = day(data.startDate) === day(prev.startDate) && day(data.dueDate) === day(prev.dueDate)
        if (!unchanged && body.startDate && body.dueDate && new Date(body.dueDate) < new Date(body.startDate)) throw fail('Due date cannot be before the start date')
        if (status === COMPLETE && prev.status !== COMPLETE) { const n = await openChildren(id); if (n) throw fail(FINISH_SUBTASKS(n), 409) } data.dateFinished = status === COMPLETE ? prev.dateFinished || new Date() : null }
    else { if (body.startDate && body.dueDate && new Date(body.dueDate) < new Date(body.startDate)) throw fail('Due date cannot be before the start date'); data.dateFinished = status === COMPLETE ? new Date() : null }
    const task = id
        ? await prisma.crmTask.update({ where: { id }, data })
        : await prisma.crmTask.create({ data: { ...data, addedFrom: a.staffId, startDate: data.startDate || new Date() } })
    if (!id) emit('task.created', { id: task.id, name: task.name, due_date: task.dueDate }); else if (status === COMPLETE && prev?.status !== COMPLETE) emit('task.completed', { id: task.id, name: task.name })
    await notifyNewMentions({ by: { staffId: a.staffId, name: session.user.name }, text: data.description, prev: prev?.description, link: `/crm/tasks/${task.id}`, subject: data.name })
    const sync = async (model, ids, extra = {}) => {
        const want = [...new Set((ids || []).map(oid).filter(Boolean))]
        const have = await prisma[model].findMany({ where: { taskId: task.id }, select: { id: true, staffId: true } })
        const drop = have.filter((h) => !want.includes(h.staffId)).map((h) => h.id)
        if (drop.length) await prisma[model].deleteMany({ where: { id: { in: drop } } })
        const add = want.filter((w) => !have.some((h) => h.staffId === w))
        for (const staffId of add) await prisma[model].create({ data: { taskId: task.id, staffId, ...extra } })
    }
    const withCreator = (list, on) => (on && a.staffId && !(list || []).includes(a.staffId) ? [...(list || []), a.staffId] : list)
    const assignees = id ? body.assigneeIds : withCreator(Array.isArray(body.assigneeIds) ? body.assigneeIds : [], S?.on('new_task_auto_assign_current_member'))
    const withAdmins = async (list) => (S?.on('new_task_follow_super_admin') ? [...new Set([...(list || []), ...(await superAdminIds())])] : list)
    const followers = id ? body.followerIds : await withAdmins(withCreator(Array.isArray(body.followerIds) ? body.followerIds : [], S?.on('new_task_auto_follower_current_member')))
    if (Array.isArray(assignees)) await sync('crmTaskAssigned', assignees, { assignedFrom: a.staffId })
    await trackTask({ task, prev, a, assigneeIds: Array.isArray(assignees) ? assignees : null })
    if (Array.isArray(followers)) await sync('crmTaskFollower', followers)
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

const openChildren = (id) => prisma.crmTask.count({ where: { parentId: id, status: { not: COMPLETE } } })
const NEW_TASK_KEYS = ['default_task_priority', 'default_task_status', 'task_biillable_checked_on_creation', 'new_task_auto_assign_current_member', 'new_task_auto_follower_current_member', 'new_task_follow_super_admin']
const FINISH_SUBTASKS = (n) => `Finish the subtasks first (${n} still open)`
/** The task and everything under it (subtasks, their subtasks...). */
async function descendants(id) {
    const out = []
    let level = [id]
    while (level.length && out.length < 500) {
        const kids = await prisma.crmTask.findMany({ where: { parentId: { in: level } }, select: { id: true } })
        level = kids.map((k) => k.id)
        out.push(...level)
    }
    return out
}

export async function moveTask(id, { status, order }) {
    const session = await requirePermission('tasks', 'edit')
    const a = await access(session)
    const t = await loadOne(id, a)
    const st = (await statusCodes()).has(+status) ? +status : t.status
    if (!mayAct(a, t)) throw fail(NOT_YOURS, 403)
    if (st === COMPLETE && t.status !== COMPLETE) { const n = await openChildren(id); if (n) throw fail(FINISH_SUBTASKS(n), 409) }
    await prisma.crmTask.update({ where: { id }, data: { status: st, kanbanOrder: Number.isFinite(+order) ? Math.round(+order) : t.kanbanOrder, dateFinished: st === COMPLETE ? t.dateFinished || new Date() : null } })
    if (st !== t.status) await trackTask({ task: { ...t, status: st }, prev: t, a })
    return { success: true }
}

/** Persist a whole column order after a drop (ids in display order). */
export async function reorderTasks(status, ids) {
    const session = await requirePermission('tasks', 'edit')
    const a = await access(session)
    const st = (await statusCodes()).has(+status) ? +status : null
    if (!Array.isArray(ids) || (!st && status != null)) throw fail('Bad request')
    const where = await visibleWhere(a)
    if (!st) { // no status: only the order of a list that mixes statuses (the tasks of a lead), nothing else changes
        const list = ids.filter(oid).slice(0, 500)
        for (const [i, id] of list.entries()) await prisma.crmTask.updateMany({ where: { AND: [{ id }, where] }, data: { kanbanOrder: i } })
        return { success: true, denied: 0, blocked: 0 }
    }
    let denied = 0, blocked = 0
    for (const [i, id] of ids.filter(oid).entries()) {
        const t = await prisma.crmTask.findFirst({ where: { AND: [{ id }, where] }, select: { status: true, dateFinished: true, addedFrom: true, assignees: { select: { staffId: true } } } })
        if (!t) continue
        if (t.status !== st && !mayAct(a, t)) { denied++; continue }
        if (st === COMPLETE && t.status !== COMPLETE && (await openChildren(id))) { blocked++; continue }
        await prisma.crmTask.update({ where: { id }, data: { kanbanOrder: i, ...(t.status !== st ? { status: st, dateFinished: st === COMPLETE ? new Date() : null } : {}) } })
    }
    if (denied && denied === ids.filter(oid).length) throw fail(NOT_YOURS, 403)
    if (blocked && blocked === ids.filter(oid).length) throw fail('Finish the subtasks first', 409)
    return { success: true, denied, blocked }
}

/** Drag and drop on the task lists: optionally move a task to another project / group, then store the order of `ids`. */
export async function regroupTask({ id, relType, relId, ids, ...rest }) {
    const session = await requirePermission('tasks', 'edit')
    const a = await access(session)
    const where = await visibleWhere(a)
    if (oid(id)) {
        const t = await prisma.crmTask.findFirst({ where: { AND: [{ id }, where] }, select: { id: true, addedFrom: true, assignees: { select: { staffId: true } } } })
        if (!t) throw fail('Task not found', 404)
        if (!mayAct(a, t)) throw fail(NOT_YOURS, 403)
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
    if (!mayAct(a, await loadOne(id, a))) throw fail(NOT_YOURS, 403)
    for (const tid of [...(await descendants(id)).reverse(), id]) {
        await prisma.crmTaskTimer.deleteMany({ where: { taskId: tid } })
        await prisma.crmTask.delete({ where: { id: tid } })
    }
    return { success: true }
}

export async function addComment(id, content, replyToId, toClient = false) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    const task = await loadOne(id, a)
    const text = storeRich(content)
    if (!text) throw fail('Write a comment first')
    const reply = oid(replyToId) && (await prisma.crmTaskComment.findFirst({ where: { id: replyToId, taskId: id }, select: { id: true, staffId: true } }))
    await prisma.crmTaskComment.create({ data: { taskId: id, content: text, staffId: a.staffId, replyToId: reply ? reply.id : null, toClient: !!toClient && !!task.visibleToClient } })
    if (task.relType === 'lead' && oid(task.relId)) await logLead(task.relId, a.staffId, `Comment on task “${task.name}”`)
    // a comment sent to the client of a shared task: its contacts are told (phone and email, unless switched off)
    if (toClient && task.visibleToClient) { try { const { tellClientOfTask } = await import('@/lib/crm/taskClient'); await tellClientOfTask(task, { who: session.user.name, text: plainText(text) }) } catch (e) { console.error('[task client notify]', e.message) } }
    // told: the people named with @, and everyone who follows the task (assigned, following, who created it, who is answered)
    try {
        const [asg, fol] = await Promise.all([prisma.crmTaskAssigned.findMany({ where: { taskId: id }, select: { staffId: true } }), prisma.crmTaskFollower.findMany({ where: { taskId: id }, select: { staffId: true } })])
        await notifyComment({ by: { staffId: a.staffId, name: session.user.name }, text, link: `/crm/tasks/${id}?tab=comments`, subject: task.name, recipients: [...asg.map((x) => x.staffId), ...fol.map((x) => x.staffId), task.addedFrom, reply?.staffId] })
    } catch (e) { console.error('[comment notify]', e.message) }
    return { success: true }
}

/** Adds the emoji reaction of the signed-in person to a comment, or takes it back when it is already there. */
export async function reactComment(id, commentId, emoji) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const e = String(emoji || '').trim()
    if (!e || e.length > 16) throw fail('Pick an emoji')
    if (!a.staffId) throw fail('Only staff can react', 403)
    const c = oid(commentId) && (await prisma.crmTaskComment.findFirst({ where: { id: commentId, taskId: id } }))
    if (!c) throw fail('Comment not found', 404)
    const all = c.reactions && typeof c.reactions === 'object' ? { ...c.reactions } : {}
    const ids = Array.isArray(all[e]) ? all[e] : []
    const next = ids.includes(a.staffId) ? ids.filter((x) => x !== a.staffId) : [...ids, a.staffId]
    if (next.length) all[e] = next; else delete all[e]
    await prisma.crmTaskComment.update({ where: { id: commentId }, data: { reactions: all, updatedAt: c.updatedAt } })
    return { success: true }
}

/** Tags a colleague on a comment that is already sent: their name is added under it and they are told. Anyone who can see the record may do it. */
export async function mentionComment(id, commentId, staffId) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const c = oid(commentId) && (await prisma.crmTaskComment.findFirst({ where: { id: commentId, taskId: id } }))
    if (!c) throw fail('Comment not found', 404)
    const who = oid(staffId) && (await prisma.crmStaff.findFirst({ where: { id: staffId, active: true }, select: { id: true, firstName: true, lastName: true, email: true } }))
    if (!who) throw fail('Choose a colleague')
    const name = [who.firstName, who.lastName].filter(Boolean).join(' ') || who.email || 'Staff'
    const plain = plainText(c.content || '')
    if (!plain.includes(`@${name}`)) await prisma.crmTaskComment.update({ where: { id: commentId }, data: { content: `${c.content || ''}<p>@${name.replace(/[&<>]/g, '')}</p>`, updatedAt: c.updatedAt } })
    await notifyMentions({ staffIds: [who.id], text: plain, url: `/crm/tasks/${id}?tab=comments` })
    return { success: true }
}

export async function editComment(id, commentId, content) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const c = oid(commentId) && (await prisma.crmTaskComment.findFirst({ where: { id: commentId, taskId: id } }))
    if (!c) throw fail('Comment not found', 404)
    if (!a.staffId || c.staffId !== a.staffId) throw fail('You can only edit your own comments', 403)
    const text = storeRich(content)
    if (!text) throw fail('Write a comment first')
    await prisma.crmTaskComment.update({ where: { id: commentId }, data: { content: text } })
    return { success: true }
}

export async function deleteComment(id, commentId) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const c = oid(commentId) && (await prisma.crmTaskComment.findFirst({ where: { id: commentId, taskId: id } }))
    if (!c) throw fail('Comment not found', 404)
    if (c.staffId !== a.staffId && !a.can('delete')) throw fail('You can only delete your own comments', 403)
    // optional rule: comments can only be removed during the first hour (managers are not bound by it)
    if (a.scope !== 'all' && (await readSettings(['client_staff_add_edit_delete_task_comments_first_hour'])).on('client_staff_add_edit_delete_task_comments_first_hour') && Date.now() - +new Date(c.createdAt) > 3600000) throw fail('Comments can only be removed during the first hour', 403)
    await prisma.crmTaskComment.delete({ where: { id: commentId } })
    return { success: true }
}

const REMINDERS = [0, 60, 1440, 2880]
/** Everyone a checklist step is given to (the old single person included). */
const stepPeople = (c) => [...new Set([...(c.assignedIds || []), c.assigned].filter(Boolean))]
const pickPeople = (v) => [...new Set((Array.isArray(v) ? v : v ? [v] : []).map(oid).filter(Boolean))].slice(0, 12)
const dayOrNull = (v) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00.000Z`) : null)

/** The checklist of a task: add, tick, edit (text, person, date, reminder), reorder, delete. A person a step is assigned to may tick it. */
/** A checklist change: in the task's activity, and in the lead's when the task is linked to one. */
async function trackStep(task, a, text) {
    await logTask(task.id, a.staffId, 'checklist', text)
    if (task.relType === 'lead' && oid(task.relId)) await logLead(task.relId, a.staffId, `Task “${task.name}”: ${text}`)
}

export async function checklist(id, op) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    const task = await loadOne(id, a)
    const mine = (item) => !!a.staffId && stepPeople(item || {}).includes(a.staffId)
    const notify = async (people, text) => {
        // each person the step is given to is told (bell), and anyone named with @ in the text
        for (const assigned of people.filter((x) => x !== a.staffId)) {
            await prisma.crmNotification.create({ data: { toUserId: assigned, fromUserId: a.staffId, fromFullName: session.user.name || null, description: String(text || '').slice(0, 160), link: `/crm/tasks/${id}`, additionalData: `assign|${String(task.name || '').slice(0, 100)}`, isRead: false } })
            notifyNotice(assigned, { kind: 'checklist', headlineKey: 'gaveStep', vars: { name: session.user.name || '…' }, relType: 'task', relId: id, note: String(text || '').slice(0, 160) })
        }
        await notifyNewMentions({ by: { staffId: a.staffId, name: session.user.name }, text, prev: '', link: `/crm/tasks/${id}`, subject: task.name })
    }
    if (op.action === 'toggle') {
        const item = oid(op.itemId) && (await prisma.crmTaskChecklistItem.findFirst({ where: { id: op.itemId, taskId: id } }))
        if (!item) throw fail('Item not found', 404)
        if (!mayAct(a, task) && !mine(item)) throw fail(NOT_YOURS, 403)
        await prisma.crmTaskChecklistItem.update({ where: { id: item.id }, data: { finished: !!op.finished, finishedFrom: op.finished ? a.staffId : null } })
        await trackStep(task, a, `Checklist item ${op.finished ? 'done' : 'reopened'}: ${item.description}`)
        return { success: true }
    }
    if (!mayAct(a, task)) throw fail(NOT_YOURS, 403)
    if (op.action === 'add') {
        const description = String(op.description || '').trim().slice(0, 500)
        if (!description) throw fail('Write the item first')
        const last = await prisma.crmTaskChecklistItem.findFirst({ where: { taskId: id }, orderBy: { listOrder: 'desc' }, select: { listOrder: true } })
        const people = pickPeople(op.assignedIds ?? op.assigned)
        await prisma.crmTaskChecklistItem.create({ data: { taskId: id, description, listOrder: (last?.listOrder ?? 0) + 1, addedFrom: a.staffId, finished: false, assigned: people[0] || null, assignedIds: people, dueDate: dayOrNull(op.dueDate), hours: hoursOrNull(op.hours), reminder: REMINDERS.includes(+op.reminder) && op.reminder !== null && op.reminder !== '' ? +op.reminder : null } })
        await notify(people, description)
        await trackStep(task, a, `Checklist item added: ${description}${people.length ? ` (for ${await namesOf(people)})` : ''}`)
        return { success: true }
    }
    if (op.action === 'reorder') {
        const valid = new Set((await prisma.crmTaskChecklistItem.findMany({ where: { taskId: id }, select: { id: true } })).map((x) => x.id))
        await Promise.all((op.ids || []).filter((x) => valid.has(x)).map((x, n) => prisma.crmTaskChecklistItem.update({ where: { id: x }, data: { listOrder: n + 1 } })))
        return { success: true }
    }
    const item = oid(op.itemId) && (await prisma.crmTaskChecklistItem.findFirst({ where: { id: op.itemId, taskId: id } }))
    if (!item) throw fail('Item not found', 404)
    if (op.action === 'delete') { await prisma.crmTaskChecklistItem.delete({ where: { id: item.id } }); await trackStep(task, a, `Checklist item removed: ${item.description}`) }
    else if (op.action === 'update') {
        const data = {}
        if (op.description !== undefined) { const d = String(op.description || '').trim().slice(0, 500); if (!d) throw fail('Write the item first'); data.description = d }
        let added = []
        if (oid(op.toggleAssignee)) { // one person added or removed, worked out from what is stored (two quick clicks never overwrite each other)
            const cur = stepPeople(item)
            const now = cur.includes(op.toggleAssignee) ? cur.filter((x) => x !== op.toggleAssignee) : [...cur, op.toggleAssignee]
            added = now.filter((x) => !cur.includes(x)); data.assignedIds = now; data.assigned = now[0] || null
        } else if (op.assignedIds !== undefined || op.assigned !== undefined) { const now = pickPeople(op.assignedIds ?? op.assigned); added = now.filter((x) => !stepPeople(item).includes(x)); data.assignedIds = now; data.assigned = now[0] || null }
        if (op.dueDate !== undefined) data.dueDate = dayOrNull(op.dueDate)
        if (op.hours !== undefined) data.hours = hoursOrNull(op.hours)
        if (op.reminder !== undefined) data.reminder = op.reminder === null || op.reminder === '' ? null : REMINDERS.includes(+op.reminder) ? +op.reminder : null
        await prisma.crmTaskChecklistItem.update({ where: { id: item.id }, data })
        if (added.length) await trackStep(task, a, `Checklist item “${data.description ?? item.description}” given to ${await namesOf(added)}`)
        if (added.length) await notify(added, data.description ?? item.description)
        else if (data.description) await notifyNewMentions({ by: { staffId: a.staffId, name: session.user.name }, text: data.description, prev: item.description, link: `/crm/tasks/${id}`, subject: task.name })
    } else throw fail('Unknown action')
    return { success: true }
}

export async function timer(id, op) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    const t = await loadOne(id, a)
    if (!a.staffId) throw fail('Your login is not linked to a staff member')
    const open = await prisma.crmTaskTimer.findFirst({ where: { taskId: id, staffId: a.staffId, endTime: null } })
    if (op.action === 'start') {
        if (!mayAct(a, t)) throw fail(NOT_YOURS, 403)
        if (open) throw fail('Timer already running')
        if (t.status === COMPLETE) throw fail('This task is complete')
        const S = await readSettings(['auto_stop_tasks_timers_on_new_timer', 'timer_started_change_status_in_progress'])
        if (S.on('auto_stop_tasks_timers_on_new_timer')) await prisma.crmTaskTimer.updateMany({ where: { staffId: a.staffId, endTime: null }, data: { endTime: new Date() } }) // one timer at a time
        await prisma.crmTaskTimer.create({ data: { taskId: id, staffId: a.staffId, startTime: new Date(), endTime: null, hourlyRate: t.hourlyRate || 0 } })
        if (t.status === 1 && S.on('timer_started_change_status_in_progress')) await prisma.crmTask.update({ where: { id }, data: { status: 4 } })
    } else if (op.action === 'stop') {
        if (!open) throw fail('No timer running')
        const S = await readSettings(['round_off_task_timer_option', 'round_off_task_timer_time'])
        const step = Math.max(0, S.num('round_off_task_timer_time')) * 60000
        let end = new Date()
        if (step > 0 && open.startTime) { // round the length to the step: up, down or to the nearest
            const ms = +end - +open.startTime, mode = S.get('round_off_task_timer_option')
            end = new Date(+open.startTime + (mode === '0' ? Math.ceil(ms / step) : mode === '1' ? Math.floor(ms / step) : Math.round(ms / step)) * step)
        }
        await prisma.crmTaskTimer.update({ where: { id: open.id }, data: { endTime: end, note: String(op.note || '').slice(0, 500) || null } })
    } else if (op.action === 'delete') {
        const x = oid(op.timerId) && (await prisma.crmTaskTimer.findFirst({ where: { id: op.timerId, taskId: id } }))
        if (!x) throw fail('Entry not found', 404)
        if (x.staffId !== a.staffId && !a.can('delete_timesheet')) throw fail('Forbidden', 403)
        await prisma.crmTaskTimer.delete({ where: { id: x.id } })
    } else throw fail('Unknown action')
    return { success: true }
}

/** The active Super Admin members: they follow every new task by default (Settings → Tasks). */
const superAdminIds = async () => (await prisma.crmStaff.findMany({ where: { admin: true, active: true }, select: { id: true } })).map((x) => x.id)

export async function taskLookups() {
    const session = await requirePermission('tasks', 'view')
    const [staff, milestones] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }),
        prisma.crmMilestone.findMany({ select: { id: true, name: true }, take: 500 }),
    ])
    const S = await readSettings([...NEW_TASK_KEYS, 'tasks_kanban_limit'])
    return {
        staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })).sort((x, y) => x.name.localeCompare(y.name)), milestones, me: await getStaffId(session),
        defaults: { priority: S.num('default_task_priority', 2), status: await defaultTaskStatus(), billable: S.on('task_biillable_checked_on_creation'), assignMe: S.on('new_task_auto_assign_current_member'), followMe: S.on('new_task_auto_follower_current_member'), followAdminIds: S.on('new_task_follow_super_admin') ? await superAdminIds() : [], kanbanLimit: S.num('tasks_kanban_limit', 0) },
    }
}

/** Prisma `where` limiting tasks to what the signed-in staff member may see (for dashboards). */
export async function taskScope() {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    return { where: await ownWhere(a), staffId: a.staffId }
}


/* ---------------- templates ---------------- */
const parseJson = (raw, fallback) => { try { const v = JSON.parse(raw || ''); return Array.isArray(v) ? v : fallback } catch { return fallback } }
const shapeTemplate = (t) => ({ id: t.id, name: t.name, description: t.description || '', priority: t.priority, billable: t.billable, dueInDays: t.dueInDays, checklist: parseJson(t.checklistRaw, []), subtasks: parseJson(t.subtasksRaw, []) })

export async function listTemplates() {
    await requirePermission('tasks', 'view')
    const rows = await prisma.crmTaskTemplate.findMany({ orderBy: { name: 'asc' }, take: 200 })
    return { list: rows.map(shapeTemplate) }
}

export async function saveTemplate(body, id) {
    const session = await requirePermission('tasks', id ? 'edit' : 'create')
    const a = await access(session)
    const name = String(body.name || '').trim().slice(0, 150)
    if (!name) throw fail('Give the template a name')
    const checklist = (Array.isArray(body.checklist) ? body.checklist : []).map((x) => String(x || '').trim().slice(0, 500)).filter(Boolean).slice(0, 60)
    const subtasks = (Array.isArray(body.subtasks) ? body.subtasks : []).map((x) => ({ name: String(x?.name || '').trim().slice(0, 150), priority: [1, 2, 3, 4].includes(+x?.priority) ? +x.priority : 2, dueInDays: Math.max(0, parseInt(x?.dueInDays, 10) || 0) })).filter((x) => x.name).slice(0, 40)
    const data = { name, description: body.description ?? null, priority: [1, 2, 3, 4].includes(+body.priority) ? +body.priority : 2, billable: !!body.billable, dueInDays: Math.max(0, parseInt(body.dueInDays, 10) || 0), checklistRaw: JSON.stringify(checklist), subtasksRaw: JSON.stringify(subtasks) }
    if (id) {
        const cur = await prisma.crmTaskTemplate.findUnique({ where: { id } })
        if (!cur) throw fail('Template not found', 404)
        if (cur.addedFrom !== a.staffId && a.scope !== 'all') throw fail('Only the author of a template or a manager can change it', 403)
        return shapeTemplate(await prisma.crmTaskTemplate.update({ where: { id }, data }))
    }
    return shapeTemplate(await prisma.crmTaskTemplate.create({ data: { ...data, addedFrom: a.staffId } }))
}

export async function deleteTemplate(id) {
    const session = await requirePermission('tasks', 'delete')
    const a = await access(session)
    const cur = oid(id) && (await prisma.crmTaskTemplate.findUnique({ where: { id } }))
    if (!cur) throw fail('Template not found', 404)
    if (cur.addedFrom !== a.staffId && a.scope !== 'all') throw fail('Only the author of a template or a manager can delete it', 403)
    await prisma.crmTaskTemplate.delete({ where: { id } })
    return { success: true }
}

/** Keep a task (its checklist and subtasks) as a template. */
export async function templateFromTask(taskId, name) {
    const session = await requirePermission('tasks', 'create')
    const a = await access(session)
    const t = await loadOne(taskId, a)
    const kids = await prisma.crmTask.findMany({ where: { parentId: taskId }, orderBy: [{ kanbanOrder: 'asc' }, { createdAt: 'asc' }] })
    const day = 86400000
    const rel = (x) => (x.dueDate && (x.startDate || x.createdAt) ? Math.max(0, Math.round((+x.dueDate - +(x.startDate || x.createdAt)) / day)) : 0)
    return saveTemplate({
        name: name || t.name, description: t.description, priority: t.priority, billable: t.billable, dueInDays: rel(t),
        checklist: t.checklistItems.map((c) => c.description), subtasks: kids.map((k) => ({ name: k.name, priority: k.priority, dueInDays: rel(k) })),
    })
}

/** New task from a template: the task, its checklist and its subtasks, assigned to the person (or the ones given). */
export async function taskFromTemplate(templateId, body = {}) {
    const session = await requirePermission('tasks', 'create')
    const a = await access(session)
    const tpl = oid(templateId) && (await prisma.crmTaskTemplate.findUnique({ where: { id: templateId } }))
    if (!tpl) throw fail('Template not found', 404)
    const start = body.startDate ? new Date(body.startDate) : new Date(new Date().toISOString().slice(0, 10))
    const due = (n) => (n > 0 ? new Date(+start + n * 86400000) : null)
    const who = (Array.isArray(body.assigneeIds) && body.assigneeIds.length ? body.assigneeIds : a.staffId ? [a.staffId] : []).map(oid).filter(Boolean)
    const watchers = (await readSettings(['new_task_follow_super_admin'])).on('new_task_follow_super_admin') ? await superAdminIds() : []
    const base = { relType: body.relType || null, relId: oid(body.relId), milestoneId: oid(body.milestoneId), isPublic: false, addedFrom: a.staffId, startDate: start }
    const make = async (data, checklist = []) => {
        const t = await prisma.crmTask.create({ data: { ...base, ...data } })
        for (const staffId of who) await prisma.crmTaskAssigned.create({ data: { taskId: t.id, staffId, assignedFrom: a.staffId } })
        for (const staffId of watchers) if (!who.includes(staffId)) await prisma.crmTaskFollower.create({ data: { taskId: t.id, staffId } })
        for (const [i, d] of checklist.entries()) await prisma.crmTaskChecklistItem.create({ data: { taskId: t.id, description: d, listOrder: i + 1, addedFrom: a.staffId, finished: false } })
        return t
    }
    const main = await make({ name: tpl.name, description: tpl.description, priority: tpl.priority, billable: tpl.billable, dueDate: due(tpl.dueInDays), status: 1 }, parseJson(tpl.checklistRaw, []))
    for (const s of parseJson(tpl.subtasksRaw, [])) await make({ name: s.name, priority: s.priority || 2, dueDate: due(s.dueInDays || 0), status: 1, parentId: main.id })
    return { success: true, id: main.id }
}


/** The figures behind the cards of the task lists: what is due when, what is late, what is being worked on, and the time logged today. */
export async function taskSummary(p = {}) {
    const session = await requirePermission('tasks', 'view')
    const a = await access(session)
    const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? new Date(`${v}T00:00:00.000Z`) : null)
    const today = day(p.today) || day(new Date().toISOString().slice(0, 10))
    const plus = (d, n) => new Date(+d + n * 86400000)
    const base = [await visibleWhere(a)]
    let mineIds = null
    if (p.mine === '1' && a.staffId) {
        mineIds = (await prisma.crmTaskAssigned.findMany({ where: { staffId: a.staffId }, select: { taskId: true } })).map((x) => x.taskId)
        base.push({ id: { in: mineIds } })
    }
    if (p.relType) base.push({ relType: p.relType })
    if (oid(p.relId)) base.push({ relId: p.relId })
    const count = (...w) => prisma.crmTask.count({ where: { AND: [...base, ...w] } })
    const dueOn = (from, to) => ({ AND: [{ dueDate: { not: null } }, { dueDate: { gte: from, lt: plus(to, 1) } }] })
    const wFrom = day(p.weekFrom) || today, wTo = day(p.weekTo) || plus(today, 6)
    const open = { status: { not: COMPLETE } }, done = { status: COMPLETE }
    const [dueToday, dueTodayDone, overdue, tomorrow, week, weekDone, noDate, inProgress, waiting, doneToday, unassigned] = await Promise.all([
        count(dueOn(today, today)), count(dueOn(today, today), done), count({ AND: [{ dueDate: { not: null } }, { dueDate: { lt: today } }], ...open }),
        count(dueOn(plus(today, 1), plus(today, 1))), count(dueOn(wFrom, wTo)), count(dueOn(wFrom, wTo), done),
        count({ dueDate: null }, open), count({ status: 4 }), count({ status: { in: [2, 3] } }),
        count(done, { dateFinished: { gte: today, lt: plus(today, 1) } }), count({ assignees: { none: {} } }, open),
    ])
    // time logged today (the person's own on "my tasks", everybody's on the team list) and the timer that is running now
    const mineOnly = p.mine === '1'
    const timers = await prisma.crmTaskTimer.findMany({ where: { ...(mineOnly || !a.staffId ? { staffId: a.staffId || NONE } : {}), OR: [{ endTime: { gte: today } }, { endTime: null }], startTime: { not: null } }, select: { id: true, taskId: true, staffId: true, startTime: true, endTime: true }, take: 2000 })
    let ms = 0
    for (const t of timers) { const from = Math.max(+t.startTime, +today), to = t.endTime ? +t.endTime : Date.now(); if (to > from) ms += to - from }
    const mine = timers.find((t) => !t.endTime && t.staffId === a.staffId)
    const running = mine ? await prisma.crmTask.findUnique({ where: { id: mine.taskId }, select: { id: true, name: true } }) : null
    return { dueToday, dueTodayDone, overdue, tomorrow, week, weekDone, noDate, inProgress, waiting, doneToday, unassigned, hoursToday: Math.round((ms / 3600000) * 10) / 10, running: running ? { ...running, since: mine.startTime } : null }
}

/**
 * One action on several tasks at once (the Tasks list): status, priority, add a person, delete. Each task goes through the same permission
 * rules as when it is changed alone; the answer says how many worked and which did not (and why).
 */
export async function bulkTasks({ ids = [], action, value } = {}) {
    const list = [...new Set((Array.isArray(ids) ? ids : []).map(oid).filter(Boolean))].slice(0, 200)
    if (!list.length) throw fail('Select at least one task')
    const out = { done: 0, failed: [] }
    for (const id of list) {
        try {
            if (action === 'status') await moveTask(id, { status: value })
            else if (action === 'delete') await deleteTask(id)
            else if (action === 'priority' || action === 'assign') {
                const session = await requirePermission('tasks', 'edit')
                const a = await access(session)
                const t = await loadOne(id, a)
                if (!mayAct(a, t)) throw fail(NOT_YOURS, 403)
                if (action === 'priority') { if (![1, 2, 3, 4].includes(+value)) throw fail('Unknown priority'); await prisma.crmTask.update({ where: { id }, data: { priority: +value } }) }
                else {
                    const staffId = oid(value)
                    if (!staffId) throw fail('Choose a person')
                    if (!(await prisma.crmTaskAssigned.findFirst({ where: { taskId: id, staffId }, select: { id: true } }))) await prisma.crmTaskAssigned.create({ data: { taskId: id, staffId, assignedFrom: a.staffId || undefined } })
                }
            } else throw fail('Unknown action')
            out.done++
        } catch (e) { out.failed.push({ id, error: e.message }) }
    }
    return out
}
