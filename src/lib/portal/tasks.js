// Tasks shared with a client. A task the team switches "Visible to the client" on is seen in the client area when it belongs to that client: its own
// tasks, the tasks of its projects and the tasks of the lead it came from. The client sees the name, the status, the dates, the description, the
// progress of the checklist (not the internal steps), the files the team shared, and a conversation: the comments the team sent to the client and
// everything the client wrote. The client can write and add files; the team is told.
import prisma from '@/lib/prisma'
import { requirePortal } from '@/lib/portal/session'
import { storeRich, plainText } from '@/lib/crm/richText'
import { taskStatusNames } from '@/lib/crm/taskStatuses'
import { processUpload, putMedia, MediaError } from '@/lib/media'
import { notifyComment } from '@/lib/crm/mentionsApi'

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const PRIORITY = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
const who = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Client'

/** The tasks this client may see. */
export async function sharedWhere(clientId) {
    const [projects, leads] = await Promise.all([
        prisma.crmProject.findMany({ where: { clientId }, select: { id: true } }),
        prisma.crmLead.findMany({ where: { clientId }, select: { id: true } }),
    ])
    return { visibleToClient: true, OR: [{ relType: 'customer', relId: clientId }, { relType: 'project', relId: { in: projects.map((p) => p.id) } }, { relType: 'lead', relId: { in: leads.map((l) => l.id) } }] }
}

async function loadShared(id, clientId) {
    const t = oid(id) && (await prisma.crmTask.findFirst({ where: { AND: [{ id }, await sharedWhere(clientId)] } }))
    if (!t) throw httpError('Task not found', 404)
    return t
}

export async function listTasks() {
    const s = await requirePortal('projects')
    const [tasks, names] = await Promise.all([
        prisma.crmTask.findMany({ where: await sharedWhere(s.client.id), orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], take: 300, include: { checklistItems: { select: { finished: true } }, _count: { select: { comments: true } } } }),
        taskStatusNames(),
    ])
    const projectIds = [...new Set(tasks.filter((t) => t.relType === 'project').map((t) => t.relId))]
    const projects = projectIds.length ? await prisma.crmProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }) : []
    const pn = Object.fromEntries(projects.map((p) => [p.id, p.name]))
    const ids = tasks.map((t) => t.id)
    const talk = ids.length ? await prisma.crmTaskComment.findMany({ where: { taskId: { in: ids }, OR: [{ toClient: true }, { contactId: { not: null } }] }, select: { taskId: true } }) : []
    const count = {}
    for (const c of talk) count[c.taskId] = (count[c.taskId] || 0) + 1
    return {
        list: tasks.map((t) => {
            const total = t.checklistItems.length, done = t.checklistItems.filter((c) => c.finished).length
            return { id: t.id, name: t.name, status: t.status, statusLabel: names[t.status] || '', priorityLabel: PRIORITY[t.priority] || '', startDate: t.startDate, dueDate: t.dueDate, finishedAt: t.dateFinished, project: t.relType === 'project' ? pn[t.relId] || '' : '', progress: t.status === 5 ? 100 : total ? Math.round((done / total) * 100) : null, messages: count[t.id] || 0 }
        }),
    }
}

export async function getTask(id) {
    const s = await requirePortal('projects')
    const t = await loadShared(id, s.client.id)
    const [names, items, comments, files, project, assigned] = await Promise.all([
        taskStatusNames(),
        prisma.crmTaskChecklistItem.findMany({ where: { taskId: id }, select: { finished: true } }),
        prisma.crmTaskComment.findMany({ where: { taskId: id, OR: [{ toClient: true }, { contactId: { not: null } }] }, orderBy: { createdAt: 'asc' } }),
        prisma.crmMedia.findMany({ where: { relType: 'task', relId: id, visibleToClient: true, isFolder: false }, orderBy: { createdAt: 'desc' } }),
        t.relType === 'project' ? prisma.crmProject.findUnique({ where: { id: t.relId }, select: { name: true } }) : null,
        prisma.crmTaskAssigned.findMany({ where: { taskId: id }, select: { staffId: true } }),
    ])
    const staffIds = [...new Set([...comments.map((c) => c.staffId), ...assigned.map((a) => a.staffId)].filter(Boolean))]
    const staff = staffIds.length ? await prisma.crmStaff.findMany({ where: { id: { in: staffIds } }, select: { id: true, firstName: true, lastName: true, email: true } }) : []
    const sn = Object.fromEntries(staff.map((x) => [x.id, [x.firstName, x.lastName].filter(Boolean).join(' ') || x.email || 'Team']))
    const contactIds = [...new Set(comments.map((c) => c.contactId).filter(Boolean))]
    const contacts = contactIds.length ? await prisma.crmContact.findMany({ where: { id: { in: contactIds } }, select: { id: true, firstName: true, lastName: true, email: true } }) : []
    const cn = Object.fromEntries(contacts.map((c) => [c.id, who(c)]))
    const total = items.length, done = items.filter((c) => c.finished).length
    const quote = (c) => { const r = c.replyToId ? comments.find((x) => x.id === c.replyToId) : null; return r ? { id: r.id, name: r.contactId ? cn[r.contactId] : sn[r.staffId] || 'Team', text: plainText(r.content || '').replace(/\s+/g, ' ').slice(0, 90) } : null }
    return {
        task: { id: t.id, name: t.name, description: t.description || '', status: t.status, statusLabel: names[t.status] || '', priorityLabel: PRIORITY[t.priority] || '', startDate: t.startDate, dueDate: t.dueDate, finishedAt: t.dateFinished, project: project?.name || '', team: assigned.map((a) => sn[a.staffId]).filter(Boolean), progress: t.status === 5 ? 100 : total ? Math.round((done / total) * 100) : null, steps: total ? { done, total } : null },
        comments: comments.map((c) => ({ id: c.id, content: c.content || '', fromClient: !!c.contactId, authorName: c.contactId ? cn[c.contactId] || 'Client' : sn[c.staffId] || 'Team', mine: !!c.contactId && c.contactId === s.contact.id, createdAt: c.createdAt, replyToId: c.replyToId || null, replyTo: quote(c) })),
        files: files.map((f) => ({ id: f.id, name: f.name, url: f.url, kind: f.kind, size: f.size, createdAt: f.createdAt, fromClient: !f.uploadedBy && /^client:/.test(f.uploaderName || ''), by: String(f.uploaderName || '').replace(/^client:/, '') })),
        canWrite: !s.preview,
    }
}

/** The client writes on the task. */
export async function commentTask(id, body = {}) {
    const s = await requirePortal('projects')
    if (s.preview) throw httpError('This is a preview: nothing is saved', 403)
    const t = await loadShared(id, s.client.id)
    const text = storeRich(String(body.content || ''), 8000)
    if (!text) throw httpError('Write a message first')
    const reply = oid(body.replyToId) && (await prisma.crmTaskComment.findFirst({ where: { id: body.replyToId, taskId: id, OR: [{ toClient: true }, { contactId: { not: null } }] }, select: { id: true, staffId: true } }))
    const c = await prisma.crmTaskComment.create({ data: { taskId: id, content: text, contactId: s.contact.id, replyToId: reply ? reply.id : null } })
    await tellTeam(t, `${s.client.company || who(s.contact)} wrote: ${plainText(text).slice(0, 140)}`, who(s.contact), '?tab=comments', reply?.staffId)
    return { id: c.id }
}

/** The client adds files to the task (they show in its Files, marked as sent by the client). */
export async function addTaskFiles(id, formData) {
    const s = await requirePortal('projects')
    if (s.preview) throw httpError('This is a preview: nothing is saved', 403)
    const t = await loadShared(id, s.client.id)
    const files = formData.getAll('files').filter((f) => f && typeof f !== 'string').slice(0, 8)
    if (!files.length) throw httpError('Choose a file')
    const kept = []
    for (const f of files) {
        try {
            const p = await processUpload(f, { purpose: 'attachment' })
            const { key, url } = await putMedia(p, 'task')
            await prisma.crmMedia.create({ data: { name: p.name, key, url, mime: p.contentType, kind: p.kind, size: p.size, originalSize: p.originalSize, width: p.width, height: p.height, purpose: 'attachment', parentId: null, relType: 'task', relId: id, visibleToClient: true, uploaderName: `client:${who(s.contact)}` } })
            kept.push(p.name)
        } catch (e) { if (e instanceof MediaError) throw httpError(e.message); throw e }
    }
    await tellTeam(t, `${s.client.company || who(s.contact)} added ${kept.length === 1 ? 'a file' : `${kept.length} files`}: ${kept.join(', ').slice(0, 120)}`, who(s.contact), '?tab=files')
    return { added: kept.length }
}

/** The people who work on the task are told: its assignees, followers, whoever created it, and the person answered. */
async function tellTeam(task, text, name, tab, extra) {
    try {
        const [asg, fol] = await Promise.all([prisma.crmTaskAssigned.findMany({ where: { taskId: task.id }, select: { staffId: true } }), prisma.crmTaskFollower.findMany({ where: { taskId: task.id }, select: { staffId: true } })])
        await notifyComment({ by: { staffId: undefined, name }, text, link: `/crm/tasks/${task.id}${tab}`, subject: task.name, recipients: [...asg.map((x) => x.staffId), ...fol.map((x) => x.staffId), task.addedFrom, extra] })
    } catch (e) { console.error('[portal task notify]', e.message) }
}
