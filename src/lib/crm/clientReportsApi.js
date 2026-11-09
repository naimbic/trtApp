// The "Reports & Strategies" tab of a client: reports the team sends to the client and strategies it proposes.
// Built like Requests: a board of statuses, a popup with files, links and a conversation (staff side).
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap } from '@/lib/crm/permissions'
import { scope as clientScope } from '@/lib/crm/clientsApi'
import { storeRich, plainText } from '@/lib/crm/richText'
import { deliver, escapeHtml } from '@/lib/crm/mailer'
import { notifyComment } from '@/lib/crm/mentionsApi'
import { realPicture } from '@/lib/crm/pictures'
import { cleanAttachments } from '@/lib/crm/notesCalc'
import { UPLOAD_PREFIX, storeRequestFile, extrasIn, extrasOut, saidOf } from '@/lib/crm/clientRequestsApi'
import { rateLimit } from '@/lib/rateLimit'
import { STATUSES, STATUS_LABEL, STATUS_COLOR, KINDS, PRIORITIES, cleanStatus, cleanKind, cleanPriority, cleanLinks, codeOf } from '@/lib/crm/clientReportsCalc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

async function gate(cap) {
    const session = await requirePermission('client_reports', cap)
    const authority = session.user.authority || []
    return { session, authority, staffId: await getStaffId(session), name: session.user.name || session.user.email }
}
async function clientOf(g, clientId) {
    if (!oid(clientId)) throw fail('Client not found', 404)
    const c = await prisma.crmClient.findFirst({ where: { id: clientId, ...(await clientScope(g.session)) } })
    if (!c) throw fail('Client not found', 404)
    return c
}
const reportOf = async (clientId, id) => { const r = oid(id) && (await prisma.crmClientReport.findFirst({ where: { id, clientId } })); if (!r) throw fail('Not found', 404); return r }

export const reportOut = (r, extra = {}) => ({
    id: r.id, clientId: r.clientId, kind: r.kind, seq: r.seq || 0, code: codeOf(r.seq, r.kind), title: r.title, body: r.body || '', status: r.status, period: r.period || '',
    priority: r.priority || 2, visible: r.visible !== false, assigneeIds: r.assigneeIds || [], dueDate: r.dueDate,
    attachments: Array.isArray(r.attachments) ? r.attachments : [], links: Array.isArray(r.links) ? r.links : [],
    sentAt: r.sentAt, sentTo: r.sentTo || [], createdBy: r.createdBy || null, createdAt: r.createdAt, updatedAt: r.updatedAt, ...extra,
})

export async function listReports(clientId) {
    const g = await gate('view')
    const client = await clientOf(g, clientId)
    const [rows, staff, contacts] = await Promise.all([
        prisma.crmClientReport.findMany({ where: { clientId }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 500 }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true }, orderBy: { firstName: 'asc' } }),
        prisma.crmContact.findMany({ where: { clientId, active: true }, select: { id: true, firstName: true, lastName: true, email: true, isPrimary: true }, orderBy: { isPrimary: 'desc' } }),
    ])
    const counts = {}
    if (rows.length) for (const c of await prisma.crmClientReportComment.groupBy({ by: ['reportId'], where: { reportId: { in: rows.map((r) => r.id) }, authorKind: { not: 'system' } }, _count: { _all: true } })) counts[c.reportId] = c._count._all
    return {
        client: { id: client.id, company: client.company },
        list: rows.map((r) => reportOut(r, { comments: counts[r.id] || 0, by: staffName(staff.find((s) => s.id === r.createdBy)) })),
        staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })),
        contacts: contacts.map((c) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '', email: c.email || '', primary: !!c.isPrimary })).filter((c) => c.name),
        statuses: STATUSES.map((k) => ({ key: k, name: STATUS_LABEL[k], color: STATUS_COLOR[k] })), kinds: KINDS, priorities: PRIORITIES,
        can: { create: hasCap(g.authority, 'client_reports', 'create'), edit: hasCap(g.authority, 'client_reports', 'edit'), delete: hasCap(g.authority, 'client_reports', 'delete') },
    }
}

const nextSeq = async () => ((await prisma.crmClientReport.findFirst({ where: { seq: { not: null } }, orderBy: { seq: 'desc' }, select: { seq: true } }))?.seq || 0) + 1

export async function saveReport(clientId, body = {}, id = null) {
    const g = await gate(id ? 'edit' : 'create')
    await clientOf(g, clientId)
    const cur = id ? await reportOf(clientId, id) : null
    const data = {}
    if (!cur || body.title !== undefined) { const t = String(body.title || '').replace(/\s+/g, ' ').trim().slice(0, 200); if (!t) throw fail('Give it a title'); data.title = t }
    if (!cur || body.kind !== undefined) data.kind = cleanKind(body.kind)
    if (body.body !== undefined) data.body = storeRich(String(body.body || ''), 40000) || null
    if (body.period !== undefined) data.period = String(body.period || '').trim().slice(0, 80) || null
    if (body.priority !== undefined) data.priority = cleanPriority(body.priority)
    if (body.visible !== undefined) data.visible = !!body.visible
    if (body.dueDate !== undefined) { const d = body.dueDate ? new Date(body.dueDate) : null; if (d && Number.isNaN(+d)) throw fail('The date is not valid'); data.dueDate = d }
    if (body.assigneeIds !== undefined) data.assigneeIds = [...new Set((Array.isArray(body.assigneeIds) ? body.assigneeIds : []).filter(oid))].slice(0, 20)
    if (body.attachments !== undefined) data.attachments = cleanAttachments(body.attachments, UPLOAD_PREFIX)
    if (body.links !== undefined) data.links = cleanLinks(body.links)
    let statusChanged = false
    if (body.status !== undefined) { const s = cleanStatus(body.status, cur?.status || 'draft'); if (!cur || s !== cur.status) { data.status = s; data.statusChangedAt = new Date(); statusChanged = !!cur } }
    const row = cur
        ? await prisma.crmClientReport.update({ where: { id }, data })
        : await prisma.crmClientReport.create({ data: { status: 'draft', ...data, clientId, seq: await nextSeq(), createdBy: g.staffId || undefined, position: 0 } })
    if (statusChanged) await afterStatus(row, cur.status, g)
    return { success: true, id: row.id, report: reportOut(row) }
}

async function afterStatus(row, from, g) {
    await prisma.crmClientReportComment.create({ data: { reportId: row.id, authorKind: 'system', authorId: g?.staffId || undefined, authorName: g?.name || null, body: `status:${from}:${row.status}` } })
}

export async function moveReport(clientId, id, { status } = {}) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const cur = await reportOf(clientId, id)
    if (!STATUSES.includes(status)) throw fail('Unknown status')
    if (status === cur.status) return { report: reportOut(cur) }
    const row = await prisma.crmClientReport.update({ where: { id }, data: { status, statusChangedAt: new Date() } })
    await afterStatus(row, cur.status, g)
    return { report: reportOut(row) }
}

export async function deleteReport(clientId, id) {
    const g = await gate('delete')
    await clientOf(g, clientId)
    await reportOf(clientId, id)
    await prisma.crmClientReportComment.deleteMany({ where: { reportId: id } })
    await prisma.crmClientReport.delete({ where: { id } })
    return { success: true }
}

/** Emails the report or the strategy to the chosen contacts of the client, with its links, and marks it as sent. */
export async function sendReport(clientId, id, { contactIds = [], message = '' } = {}) {
    const g = await gate('edit')
    const client = await clientOf(g, clientId)
    const cur = await reportOf(clientId, id)
    const ids = [...new Set((Array.isArray(contactIds) ? contactIds : []).map(oid).filter(Boolean))]
    if (!ids.length) throw fail('Choose at least one contact')
    const contacts = (await prisma.crmContact.findMany({ where: { clientId, active: true, id: { in: ids } }, select: { firstName: true, lastName: true, email: true } })).filter((c) => EMAIL.test(String(c.email || '').trim()))
    if (!contacts.length) throw fail('None of these contacts has an email address')
    const label = cur.kind === 'strategy' ? 'Strategy' : 'Report'
    const note = String(message || '').trim().slice(0, 1000)
    const links = (Array.isArray(cur.links) ? cur.links : []).map((l) => `<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.title || l.url)}</a></li>`).join('')
    const files = (Array.isArray(cur.attachments) ? cur.attachments : []).map((a) => `<li><a href="${escapeHtml(a.url)}">${escapeHtml(a.name)}</a></li>`).join('')
    const sent = []
    for (const c of contacts) {
        const to = String(c.email).trim().toLowerCase()
        const html = `<p>Hello ${escapeHtml(c.firstName || '')},</p>${note ? `<p>${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}<h2 style="margin:16px 0 4px">${escapeHtml(cur.title)}</h2>${cur.period ? `<p style="color:#64748b;margin:0 0 12px">${escapeHtml(cur.period)}</p>` : ''}<div>${cur.body || ''}</div>${links || files ? `<ul>${links}${files}</ul>` : ''}<p style="margin-top:20px;color:#64748b">${escapeHtml(g.name)}</p>`
        const r = await deliver({ to, subject: `${label}: ${cur.title}${client.company ? ` · ${client.company}` : ''}`, html }).catch(() => ({ sent: false }))
        if (r?.sent) sent.push(to)
    }
    if (!sent.length) throw fail('The email could not be sent: check the mail settings')
    const row = await prisma.crmClientReport.update({ where: { id }, data: { status: cur.status === 'draft' ? 'sent' : cur.status, statusChangedAt: cur.status === 'draft' ? new Date() : undefined, sentAt: new Date(), sentTo: [...new Set([...(cur.sentTo || []), ...sent])] } })
    if (cur.status === 'draft') await afterStatus(row, 'draft', g)
    return { success: true, sent }
}

/* ---------- files ---------- */
export async function uploadReportFile(file) {
    const g = await gate('edit')
    rateLimit(`report-upload:${g.session.user.id}`, 40, 60000)
    return storeRequestFile(file)
}

/* ---------- the conversation ---------- */
const commentOut = (c, all, { me = null, canDelete = false } = {}) => {
    const r = c.replyToId ? all.find((x) => x.id === c.replyToId) : null
    const own = c.authorKind === 'staff' && !!me && c.authorId === me
    const sys = c.authorKind === 'system' ? c.body.split(':') : null
    return {
        id: c.id, authorKind: c.authorKind, authorName: c.authorName || '', body: sys ? '' : c.body, createdAt: c.createdAt, edited: !!c.editedAt, mine: own, internal: !!c.internal, canDelete: own || canDelete, ...(sys ? {} : extrasOut(c)),
        system: sys ? { from: sys[1], to: sys[2] } : null,
        replyTo: r && !sys ? { id: r.id, name: r.authorName || '', text: plainText(r.body).replace(/\s+/g, ' ').slice(0, 120) } : null,
    }
}

export async function listComments(clientId, id) {
    const g = await gate('view')
    await clientOf(g, clientId)
    await reportOf(clientId, id)
    const rows = await prisma.crmClientReportComment.findMany({ where: { reportId: id }, orderBy: { createdAt: 'asc' }, take: 400 })
    return { list: rows.map((c) => commentOut(c, rows, { me: g.staffId, canDelete: hasCap(g.authority, 'client_reports', 'delete') })) }
}

export async function addComment(clientId, id, body = {}) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const rep = await reportOf(clientId, id)
    const text = storeRich(String(body.body || ''), 12000) || ''
    const ex = extrasIn(body)
    if (!text && !ex.attachments.length && !ex.links.length) throw fail('Write a message first')
    const reply = oid(body.replyToId) && (await prisma.crmClientReportComment.findFirst({ where: { id: body.replyToId, reportId: id } }))
    const row = await prisma.crmClientReportComment.create({ data: { reportId: id, authorKind: 'staff', authorId: g.staffId || undefined, authorName: g.name, body: text, internal: !!body.internal, replyToId: reply ? reply.id : null, ...ex } })
    const admins = await prisma.crmCustomerAdmin.findMany({ where: { clientId }, select: { staffId: true } })
    try { await notifyComment({ by: { staffId: g.staffId, name: g.name }, text: saidOf(text, ex), link: `/crm/clients/${clientId}?tab=reports&report=${id}`, subject: rep.title, recipients: [...(rep.assigneeIds || []), rep.createdBy, ...admins.map((a) => a.staffId), reply?.authorKind === 'staff' ? reply.authorId : null].filter(Boolean) }) } catch (e) { console.error('[report notify]', e.message) }
    const all = await prisma.crmClientReportComment.findMany({ where: { reportId: id } })
    return { comment: commentOut(row, all, { me: g.staffId, canDelete: hasCap(g.authority, 'client_reports', 'delete') }) }
}

export async function editComment(clientId, id, body = {}) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const c = oid(body.commentId) && (await prisma.crmClientReportComment.findFirst({ where: { id: body.commentId, reportId: id } }))
    if (!c || c.authorKind !== 'staff') throw fail('Message not found', 404)
    if (!g.staffId || c.authorId !== g.staffId) throw fail('You can only edit your own messages', 403)
    const text = storeRich(String(body.body || ''), 12000)
    if (!text) throw fail('Write a message first')
    await prisma.crmClientReportComment.update({ where: { id: c.id }, data: { body: text, editedAt: new Date() } })
    return { success: true }
}

export async function deleteComment(clientId, id, commentId) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const c = oid(commentId) && (await prisma.crmClientReportComment.findFirst({ where: { id: commentId, reportId: id } }))
    if (!c) throw fail('Message not found', 404)
    const own = c.authorKind === 'staff' && !!g.staffId && c.authorId === g.staffId
    if (!own && !hasCap(g.authority, 'client_reports', 'delete')) throw fail('You can only delete your own messages', 403)
    await prisma.crmClientReportComment.updateMany({ where: { replyToId: c.id }, data: { replyToId: null } })
    await prisma.crmClientReportComment.delete({ where: { id: c.id } })
    return { success: true }
}

/** One task for the team from a report: linked to the client and assigned to the people of the report. */
export async function makeTask(clientId, id) {
    const g = await gate('edit')
    if (!hasCap(g.authority, 'tasks', 'create')) throw fail('You are not allowed to create tasks', 403)
    const client = await clientOf(g, clientId)
    const rep = await reportOf(clientId, id)
    const task = await prisma.crmTask.create({ data: { name: `${codeOf(rep.seq, rep.kind)} ${rep.title}`.trim().slice(0, 200), description: storeRich(rep.body || '', 20000) || null, relType: 'customer', relId: client.id, priority: Math.min(4, rep.priority || 2), dueDate: rep.dueDate || null, status: 1, addedFrom: g.staffId || undefined } })
    const people = [...new Set([...(rep.assigneeIds || []), ...(g.staffId ? [g.staffId] : [])])]
    if (people.length) await prisma.crmTaskAssigned.createMany({ data: people.map((staffId) => ({ taskId: task.id, staffId, assignedFrom: g.staffId || undefined })) }).catch(() => {})
    return { success: true, taskId: task.id }
}
