import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap } from '@/lib/crm/permissions'
import { scope as clientScope } from '@/lib/crm/clientsApi'
import { storeRich, plainText } from '@/lib/crm/richText'
import { sendTemplate } from '@/lib/crm/mailer'
import { notifyNotice } from '@/lib/crm/notifyMail'
import { publicBase } from '@/lib/crm/shortLinks'
import { realPicture } from '@/lib/crm/pictures'
import { emit } from '@/lib/crm/webhooks'
import { notifyComment } from '@/lib/crm/mentionsApi'
import { mentionedIds } from '@/lib/crm/mentionsCalc'
import { pushToContacts } from '@/lib/crm/push'
import { processUpload, putMedia, MediaError, PREFIX } from '@/lib/media'
import { CDN_URL } from '@/lib/spaces'
import { rateLimit } from '@/lib/rateLimit'
import { cleanAttachments } from '@/lib/crm/notesCalc'
import { STATUSES, STATUS_LABEL, STATUS_COLOR, TYPES, PRIORITIES, isOpen, cleanStatus, cleanType, cleanPriority, cleanUrl, codeOf } from '@/lib/crm/clientRequestsCalc'
import { emailOff } from '@/lib/crm/clientEmailAccess'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''
const contactName = (c) => [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.email || ''
export const UPLOAD_PREFIX = `${CDN_URL}/${PREFIX}/requests/`
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function gate(cap) {
    const session = await requirePermission('client_requests', cap)
    const authority = session.user.authority || []
    return { session, authority, staffId: await getStaffId(session), name: session.user.name || session.user.email }
}
async function clientOf(g, clientId) {
    if (!oid(clientId)) throw fail('Client not found', 404)
    const c = await prisma.crmClient.findFirst({ where: { id: clientId, ...(await clientScope(g.session)) } })
    if (!c) throw fail('Client not found', 404)
    return c
}

export const requestOut = (r, extra = {}) => ({
    id: r.id, clientId: r.clientId, seq: r.seq, code: codeOf(r.seq), title: r.title, body: r.body || '', type: r.type, status: r.status, priority: r.priority, visible: !!r.visible,
    source: r.source, createdByName: r.createdByName || '', url: r.url || '', attachments: Array.isArray(r.attachments) ? r.attachments : [], assigneeIds: r.assigneeIds || [],
    dueDate: r.dueDate, taskId: r.taskId || null, statusChangedAt: r.statusChangedAt, closedAt: r.closedAt, createdAt: r.createdAt, updatedAt: r.updatedAt, ...extra,
})

/** The board of one client: its requests, the team to assign and the contacts that can be named with @. */
export async function listRequests(clientId) {
    const g = await gate('view')
    const client = await clientOf(g, clientId)
    const [rows, staff, contacts] = await Promise.all([
        prisma.crmClientRequest.findMany({ where: { clientId }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 500 }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true }, orderBy: { firstName: 'asc' } }),
        prisma.crmContact.findMany({ where: { clientId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    ])
    const counts = {}
    if (rows.length) for (const c of await prisma.crmClientRequestComment.groupBy({ by: ['requestId'], where: { requestId: { in: rows.map((r) => r.id) }, authorKind: { not: 'system' } }, _count: { _all: true } })) counts[c.requestId] = c._count._all
    return {
        client: { id: client.id, company: client.company },
        list: rows.map((r) => requestOut(r, { comments: counts[r.id] || 0 })),
        staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })),
        contacts: contacts.map((c) => ({ id: c.id, name: contactName(c) })).filter((c) => c.name),
        statuses: STATUSES.map((k) => ({ key: k, name: STATUS_LABEL[k], color: STATUS_COLOR[k] })), types: TYPES, priorities: PRIORITIES,
        can: { create: hasCap(g.authority, 'client_requests', 'create'), edit: hasCap(g.authority, 'client_requests', 'edit'), delete: hasCap(g.authority, 'client_requests', 'delete') },
    }
}

export const nextSeq = async () => ((await prisma.crmClientRequest.findFirst({ orderBy: { seq: 'desc' }, select: { seq: true } }))?.seq || 0) + 1

function clean(b, existing = null) {
    const out = {}
    if (b.title !== undefined) { const t = String(b.title || '').replace(/\s+/g, ' ').trim().slice(0, 200); if (!t) throw fail('Give the request a title'); out.title = t }
    if (b.body !== undefined) out.body = storeRich(String(b.body || ''), 20000) || null
    if (b.type !== undefined) out.type = cleanType(b.type)
    if (b.priority !== undefined) out.priority = cleanPriority(b.priority)
    if (b.visible !== undefined) out.visible = !!b.visible
    if (b.url !== undefined) out.url = cleanUrl(b.url)
    if (b.dueDate !== undefined) { const d = b.dueDate ? new Date(b.dueDate) : null; if (d && Number.isNaN(+d)) throw fail('The date is not valid'); out.dueDate = d }
    if (b.assigneeIds !== undefined) out.assigneeIds = [...new Set((Array.isArray(b.assigneeIds) ? b.assigneeIds : []).filter(oid))].slice(0, 20)
    if (b.attachments !== undefined) out.attachments = cleanAttachments(b.attachments, UPLOAD_PREFIX)
    void existing
    return out
}

/** Who in the team hears about it: the people of the request and the administrators of the client. */
export async function teamOf(req, clientId) {
    const admins = await prisma.crmCustomerAdmin.findMany({ where: { clientId }, select: { staffId: true } })
    return [...new Set([...(req.assigneeIds || []), ...(req.source === 'staff' && req.createdById ? [req.createdById] : []), ...admins.map((a) => a.staffId)].filter(Boolean))]
}
export async function tellTeam(req, clientId, text, byName) {
    const link = `/crm/clients/${clientId}?tab=requests&request=${req.id}`
    for (const staffId of await teamOf(req, clientId)) {
        const st = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { active: true } })
        if (!st?.active) continue
        await prisma.crmNotification.create({ data: { toUserId: staffId, fromFullName: byName || 'Client', description: text.slice(0, 200), link, additionalData: 'client-request', isRead: false } }).catch(() => {})
        await notifyNotice(staffId, { kind: 'request', headlineKey: 'clientWrote', relType: 'customer', relId: clientId, link, note: text })
    }
}

/** The client's contacts hear about a status change or a message: email and phone. `named` = the contacts a message names with @. */
async function tellClient(req, client, { kind, who, text = '', named = [] }) {
    if (!req.visible) return 0
    const contacts = await prisma.crmContact.findMany({ where: { clientId: client.id, active: true }, select: { id: true, email: true, firstName: true, lastName: true } })
    const link = `${publicBase()}/portal/requests/${req.id}`
    const seen = new Set()
    const noMail = await emailOff(client.id, 'requests')
    let mails = 0
    for (const c of contacts) {
        const me = named.includes(c.id)
        void pushToContacts({ contactId: c.id }, { title: me ? `${who || 'trtCRM'} · @${contactName(c)}` : kind === 'status' ? `${codeOf(req.seq)} · ${STATUS_LABEL[req.status]}` : who || 'trtCRM', body: kind === 'status' ? req.title : text, url: `/portal/requests/${req.id}`, tag: `request-${req.id}` })
        const to = String(c.email || '').trim().toLowerCase()
        if (!EMAIL.test(to) || seen.has(to) || noMail) continue // the client page can switch the emails off: the phone message above still goes
        seen.add(to)
        const base = { contact_firstname: c.firstName || '', contact_lastname: c.lastName || '', client_company: client.company || '', request_title: `${codeOf(req.seq)} ${req.title}`, request_link: link, staff_name: who || '' }
        const r = kind === 'status'
            ? await sendTemplate({ slug: 'client-request-update', to, relType: 'client_request', relId: req.id, data: { ...base, request_status: STATUS_LABEL[req.status] } }).catch(() => null)
            : await sendTemplate({ slug: 'client-request-message', to, relType: 'client_request', relId: req.id, data: { ...base, request_message: `${me ? `@${contactName(c)} · ` : ''}${text.slice(0, 600)}` } }).catch(() => null)
        if (r) mails++
    }
    return mails
}

export async function saveRequest(clientId, body = {}, id = null) {
    const g = await gate(id ? 'edit' : 'create')
    const client = await clientOf(g, clientId)
    const cur = id ? (oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId } }))) : null
    if (id && !cur) throw fail('Request not found', 404)
    const data = clean(id ? body : { title: '', ...body }, cur)
    if (!id && !data.title) throw fail('Give the request a title')
    let row, mailed = 0
    if (cur) {
        const statusChanged = body.status !== undefined && cleanStatus(body.status, cur.status) !== cur.status
        if (statusChanged) { data.status = cleanStatus(body.status, cur.status); data.statusChangedAt = new Date(); data.closedAt = isOpen(data.status) ? null : new Date() }
        row = await prisma.crmClientRequest.update({ where: { id }, data })
        if (statusChanged) mailed = await afterStatus(row, cur.status, client, g)
    } else {
        const last = await prisma.crmClientRequest.findFirst({ where: { clientId, status: 'new' }, orderBy: { position: 'desc' }, select: { position: true } })
        row = await prisma.crmClientRequest.create({ data: { clientId, seq: await nextSeq(), type: 'other', status: cleanStatus(body.status), priority: 2, visible: true, ...data, source: 'staff', createdByName: g.name, createdById: g.staffId || undefined, position: (last?.position || 0) + 1, statusChangedAt: new Date() } })
        if (row.visible) mailed = await tellClient(row, client, { kind: 'status', who: g.name })
        emit('client_request.created', { id: row.id, client_id: clientId, type: row.type, title: row.title })
    }
    return { request: requestOut(row), mailed }
}

/** A status change: a line in the conversation, the client told, a webhook. */
async function afterStatus(row, from, client, g) {
    await prisma.crmClientRequestComment.create({ data: { requestId: row.id, authorKind: 'system', authorId: g?.staffId || undefined, authorName: g?.name || null, body: `status:${from}:${row.status}` } })
    emit('client_request.moved', { id: row.id, client_id: row.clientId, from, to: row.status })
    return tellClient(row, client, { kind: 'status', who: g?.name })
}

export async function moveRequest(clientId, id, { status, index } = {}) {
    const g = await gate('edit')
    const client = await clientOf(g, clientId)
    const cur = oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId } }))
    if (!cur) throw fail('Request not found', 404)
    if (!STATUSES.includes(status)) throw fail('Unknown status')
    if (status === cur.status) return { request: requestOut(cur), mailed: 0 }
    const row = await prisma.crmClientRequest.update({ where: { id }, data: { status, statusChangedAt: new Date(), closedAt: isOpen(status) ? null : new Date() } })
    const col = (await prisma.crmClientRequest.findMany({ where: { clientId, status, id: { not: id } }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], select: { id: true } })).map((x) => x.id)
    col.splice(Math.min(Math.max(parseInt(index, 10) || 0, 0), col.length), 0, id)
    await Promise.all(col.map((x, p) => prisma.crmClientRequest.update({ where: { id: x }, data: { position: p + 1 } })))
    return { request: requestOut(row), mailed: await afterStatus(row, cur.status, client, g) }
}

export async function deleteRequest(clientId, id) {
    const g = await gate('delete')
    await clientOf(g, clientId)
    const cur = oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId } }))
    if (!cur) throw fail('Request not found', 404)
    await prisma.crmClientRequestComment.deleteMany({ where: { requestId: id } })
    await prisma.crmClientRequest.delete({ where: { id } })
    return { success: true }
}

/* ---------- the conversation ---------- */
export const commentOut = (c, all, { me = null, canDelete = false, forClient = false } = {}) => {
    const r = c.replyToId ? all.find((x) => x.id === c.replyToId && (!forClient || !x.internal)) : null
    const own = forClient ? c.authorKind === 'client' : c.authorKind === 'staff' && !!me && c.authorId === me
    const sys = c.authorKind === 'system' ? c.body.split(':') : null
    return {
        id: c.id, authorKind: c.authorKind, authorName: c.authorName || '', body: sys ? '' : c.body, createdAt: c.createdAt, edited: !!c.editedAt, mine: own,
        system: sys ? { from: sys[1], to: sys[2] } : null,
        replyTo: r && !sys ? { id: r.id, name: r.authorName || '', text: plainText(r.body).replace(/\s+/g, ' ').slice(0, 120) } : null,
        ...(forClient ? {} : { internal: !!c.internal, canDelete: own || canDelete }),
    }
}

export async function listComments(clientId, id) {
    const g = await gate('view')
    await clientOf(g, clientId)
    const rows = await prisma.crmClientRequestComment.findMany({ where: { requestId: id }, orderBy: { createdAt: 'asc' }, take: 400 })
    return { list: rows.map((c) => commentOut(c, rows, { me: g.staffId, canDelete: hasCap(g.authority, 'client_requests', 'delete') })) }
}

export async function addComment(clientId, id, body = {}) {
    const g = await gate('edit')
    const client = await clientOf(g, clientId)
    const req = oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId } }))
    if (!req) throw fail('Request not found', 404)
    const text = storeRich(String(body.body || ''), 12000)
    if (!text) throw fail('Write a message first')
    const internal = !!body.internal || !req.visible
    const reply = oid(body.replyToId) && (await prisma.crmClientRequestComment.findFirst({ where: { id: body.replyToId, requestId: id } }))
    const row = await prisma.crmClientRequestComment.create({ data: { requestId: id, authorKind: 'staff', authorId: g.staffId || undefined, authorName: g.name, body: text, internal, replyToId: reply ? reply.id : null } })
    try { await notifyComment({ by: { staffId: g.staffId, name: g.name }, text, link: `/crm/clients/${clientId}?tab=requests&request=${id}`, subject: req.title, recipients: [...(await teamOf(req, clientId)), reply?.authorKind === 'staff' ? reply.authorId : null] }) } catch (e) { console.error('[request notify]', e.message) }
    if (!internal) {
        const contacts = await prisma.crmContact.findMany({ where: { clientId, active: true }, select: { id: true, firstName: true, lastName: true } })
        await tellClient(req, client, { kind: 'message', who: g.name, text: plainText(text), named: mentionedIds(plainText(text), contacts.map((c) => ({ id: c.id, name: contactName(c) }))) })
    }
    const all = await prisma.crmClientRequestComment.findMany({ where: { requestId: id } })
    return { comment: commentOut(row, all, { me: g.staffId, canDelete: hasCap(g.authority, 'client_requests', 'delete') }) }
}

export async function editComment(clientId, id, body = {}) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const c = oid(body.commentId) && (await prisma.crmClientRequestComment.findFirst({ where: { id: body.commentId, requestId: id } }))
    if (!c || c.authorKind !== 'staff') throw fail('Message not found', 404)
    if (!g.staffId || c.authorId !== g.staffId) throw fail('You can only edit your own messages', 403)
    const text = storeRich(String(body.body || ''), 12000)
    if (!text) throw fail('Write a message first')
    await prisma.crmClientRequestComment.update({ where: { id: c.id }, data: { body: text, editedAt: new Date() } })
    return { success: true }
}

export async function deleteComment(clientId, id, commentId) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const c = oid(commentId) && (await prisma.crmClientRequestComment.findFirst({ where: { id: commentId, requestId: id } }))
    if (!c) throw fail('Message not found', 404)
    const own = c.authorKind === 'staff' && !!g.staffId && c.authorId === g.staffId
    if (!own && !hasCap(g.authority, 'client_requests', 'delete')) throw fail('You can only delete your own messages', 403)
    await prisma.crmClientRequestComment.updateMany({ where: { replyToId: c.id }, data: { replyToId: null } })
    await prisma.crmClientRequestComment.delete({ where: { id: c.id } })
    return { success: true }
}

/** One task for the team from a request: linked to the client and assigned to the people of the request. */
export async function makeTask(clientId, id) {
    const g = await gate('edit')
    if (!hasCap(g.authority, 'tasks', 'create')) throw fail('You are not allowed to create tasks', 403)
    const client = await clientOf(g, clientId)
    const req = oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId } }))
    if (!req) throw fail('Request not found', 404)
    if (req.taskId && (await prisma.crmTask.findUnique({ where: { id: req.taskId }, select: { id: true } }))) return { success: true, taskId: req.taskId, existing: true }
    const link = req.url ? `<p><a href="${req.url}">${req.url}</a></p>` : ''
    const task = await prisma.crmTask.create({ data: { name: `${codeOf(req.seq)} ${req.title}`.slice(0, 200), description: storeRich(`${req.body || ''}${link}`, 20000) || null, relType: 'customer', relId: client.id, priority: Math.min(4, req.priority || 2), dueDate: req.dueDate || null, status: 1, addedFrom: g.staffId || undefined } })
    const people = [...new Set([...(req.assigneeIds || []), ...(g.staffId ? [g.staffId] : [])])]
    if (people.length) await prisma.crmTaskAssigned.createMany({ data: people.map((staffId) => ({ taskId: task.id, staffId, assignedFrom: g.staffId || undefined })) }).catch(() => {})
    await prisma.crmClientRequest.update({ where: { id }, data: { taskId: task.id } })
    return { success: true, taskId: task.id, existing: false }
}

/** A screenshot or file for a request (staff side). */
export async function uploadRequestFile(file) {
    const g = await gate('edit')
    rateLimit(`request-upload:${g.session.user.id}`, 40, 60000)
    return storeRequestFile(file)
}
export async function storeRequestFile(file) {
    try {
        const p = await processUpload(file, { purpose: 'attachment' })
        const { url } = await putMedia(p, 'requests')
        return { url, name: p.name, mime: p.contentType, size: p.size, kind: p.kind }
    } catch (e) {
        if (e instanceof MediaError) throw fail(e.message, e.status)
        throw e
    }
}

/** What the client sees of a request. */
export const requestForClient = (r) => ({ id: r.id, code: codeOf(r.seq), title: r.title, body: r.body || '', type: r.type, status: r.status, priority: r.priority, url: r.url || '', attachments: Array.isArray(r.attachments) ? r.attachments : [], dueDate: r.dueDate, createdByName: r.createdByName || '', mine: r.source === 'client', createdAt: r.createdAt, updatedAt: r.updatedAt, closed: !isOpen(r.status) })
