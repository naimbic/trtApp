import prisma from '@/lib/prisma'
import { requirePortal } from '@/lib/portal/session'
import { requestForClient, commentOut, tellTeam, nextSeq, storeRequestFile, UPLOAD_PREFIX, extrasIn, saidOf } from '@/lib/crm/clientRequestsApi'
import { storeRich, plainText } from '@/lib/crm/richText'
import { emit } from '@/lib/crm/webhooks'
import { rateLimit } from '@/lib/rateLimit'
import { cleanAttachments } from '@/lib/crm/notesCalc'
import { STATUS_LABEL, TYPES, PRIORITIES, cleanType, cleanPriority, cleanUrl, clientCanReopen, codeOf } from '@/lib/crm/clientRequestsCalc'

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const who = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email
/** The client sees the requests that are shown to it (those it sent, and those the team shared). */
const SEEN = { visible: true }
const guard = (s) => { if (s.preview) throw httpError('This is a preview: nothing is saved', 403) }

export async function listRequests() {
    const s = await requirePortal('requests')
    const rows = await prisma.crmClientRequest.findMany({ where: { clientId: s.client.id, ...SEEN }, orderBy: [{ updatedAt: 'desc' }], take: 300 })
    return { list: rows.map(requestForClient), waiting: rows.filter((r) => r.status === 'waiting').length, types: TYPES, statuses: STATUS_LABEL, priorities: PRIORITIES }
}

export async function getRequest(id) {
    const s = await requirePortal('requests')
    const r = oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId: s.client.id, ...SEEN } }))
    if (!r) throw httpError('Request not found', 404)
    const comments = await prisma.crmClientRequestComment.findMany({ where: { requestId: id }, orderBy: { createdAt: 'asc' }, take: 400 })
    return { request: requestForClient(r), types: TYPES, statuses: STATUS_LABEL, priorities: PRIORITIES, canReopen: clientCanReopen(r.status), comments: comments.filter((c) => !c.internal).map((c) => commentOut(c, comments, { forClient: true })) }
}

/** The client sends a request: an error, an integration, a change, a question. The team is told. */
export async function createRequest(body = {}) {
    const s = await requirePortal('requests')
    guard(s)
    rateLimit(`portal-request:${s.contact.id}`, 20, 3600000)
    const title = String(body.title || '').replace(/\s+/g, ' ').trim().slice(0, 200)
    if (!title) throw httpError('Give your request a title')
    const name = who(s.contact)
    const row = await prisma.crmClientRequest.create({ data: { clientId: s.client.id, seq: await nextSeq(), title, body: storeRich(String(body.body || ''), 20000) || null, type: cleanType(body.type), priority: Math.min(4, cleanPriority(body.priority)), url: cleanUrl(body.url), attachments: cleanAttachments(body.attachments, UPLOAD_PREFIX), status: 'new', visible: true, source: 'client', createdByName: name, createdById: s.contact.id, statusChangedAt: new Date() } })
    await tellTeam(row, s.client.id, `${s.client.company || name} sent a request: ${codeOf(row.seq)} ${row.title}`, name)
    emit('client_request.created', { id: row.id, client_id: s.client.id, type: row.type, title: row.title, source: 'client' })
    return { request: requestForClient(row) }
}

export async function commentRequest(id, body = {}) {
    const s = await requirePortal('requests')
    guard(s)
    const r = oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId: s.client.id, ...SEEN } }))
    if (!r) throw httpError('Request not found', 404)
    const text = storeRich(String(body.body || ''), 8000) || ''
    const ex = extrasIn(body)
    if (!text && !ex.attachments.length && !ex.links.length) throw httpError('Write a message first')
    const reply = oid(body.replyToId) && (await prisma.crmClientRequestComment.findFirst({ where: { id: body.replyToId, requestId: id, internal: false } }))
    const name = who(s.contact)
    const c = await prisma.crmClientRequestComment.create({ data: { requestId: id, authorKind: 'client', authorId: s.contact.id, authorName: name, body: text, replyToId: reply ? reply.id : null, ...ex } })
    // an answer to "waiting for the client" puts the request back with the team
    if (r.status === 'waiting') {
        const row = await prisma.crmClientRequest.update({ where: { id }, data: { status: 'reviewing', statusChangedAt: new Date() } })
        await prisma.crmClientRequestComment.create({ data: { requestId: id, authorKind: 'system', authorName: name, body: 'status:waiting:reviewing' } })
        void row
    }
    await tellTeam(r, s.client.id, `${s.client.company || name} wrote on the request ${codeOf(r.seq)} “${r.title}”: ${saidOf(text, ex).slice(0, 120)}`, name)
    const all = await prisma.crmClientRequestComment.findMany({ where: { requestId: id, internal: false } })
    return { comment: commentOut(c, all, { forClient: true }) }
}

export async function changeComment(id, body = {}, remove = false) {
    const s = await requirePortal('requests')
    guard(s)
    const r = oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId: s.client.id, ...SEEN } }))
    const c = oid(body.commentId) && (await prisma.crmClientRequestComment.findFirst({ where: { id: body.commentId, requestId: id, authorKind: 'client', authorId: s.contact.id, internal: false } }))
    if (!r || !c) throw httpError('Message not found', 404)
    if (remove) {
        await prisma.crmClientRequestComment.updateMany({ where: { replyToId: c.id }, data: { replyToId: null } })
        await prisma.crmClientRequestComment.delete({ where: { id: c.id } })
        return { success: true }
    }
    const text = storeRich(String(body.body || ''), 8000)
    if (!text) throw httpError('Write a message first')
    await prisma.crmClientRequestComment.update({ where: { id: c.id }, data: { body: text, editedAt: new Date() } })
    return { success: true }
}

/** A finished or declined request comes back to the team ("still not working"). */
export async function reopenRequest(id, body = {}) {
    const s = await requirePortal('requests')
    guard(s)
    const r = oid(id) && (await prisma.crmClientRequest.findFirst({ where: { id, clientId: s.client.id, ...SEEN } }))
    if (!r) throw httpError('Request not found', 404)
    if (!clientCanReopen(r.status)) throw httpError('This request is still open', 409)
    const name = who(s.contact)
    const row = await prisma.crmClientRequest.update({ where: { id }, data: { status: 'reviewing', statusChangedAt: new Date(), closedAt: null } })
    await prisma.crmClientRequestComment.create({ data: { requestId: id, authorKind: 'system', authorName: name, body: `status:${r.status}:reviewing` } })
    const text = storeRich(String(body.comment || ''), 8000)
    if (text) await prisma.crmClientRequestComment.create({ data: { requestId: id, authorKind: 'client', authorId: s.contact.id, authorName: name, body: text } })
    await tellTeam(row, s.client.id, `${s.client.company || name} reopened the request ${codeOf(row.seq)} “${row.title}”${text ? `: ${plainText(text).slice(0, 120)}` : ''}`, name)
    return { success: true, status: row.status }
}

export async function uploadRequestFile(file) {
    const s = await requirePortal('requests')
    guard(s)
    rateLimit(`portal-request-upload:${s.contact.id}`, 30, 3600000)
    return storeRequestFile(file)
}
