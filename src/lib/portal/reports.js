// The client area of "Reports & Strategies": the client reads what the team shared, answers (approve, ask for changes, decline) and writes back.
import prisma from '@/lib/prisma'
import { requirePortal } from '@/lib/portal/session'
import { storeRich, plainText } from '@/lib/crm/richText'
import { rateLimit } from '@/lib/rateLimit'
import { notifyNotice } from '@/lib/crm/notifyMail'
import { STATUS_LABEL, KINDS, PRIORITIES, codeOf, isOpen } from '@/lib/crm/clientReportsCalc'

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const who = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email
const guard = (s) => { if (s.preview) throw httpError('This is a preview: nothing is saved', 403) }
/** The client never sees drafts, nor what the team marked as team only (an empty flag means shown). */
const shown = (r) => r.visible !== false && r.status !== 'draft'
const ANSWERS = { approve: 'approved', changes: 'changes', decline: 'declined' }

const forClient = (r) => ({ id: r.id, code: codeOf(r.seq, r.kind), kind: r.kind, title: r.title, body: r.body || '', status: r.status, period: r.period || '', priority: r.priority || 2, dueDate: r.dueDate, attachments: Array.isArray(r.attachments) ? r.attachments : [], links: Array.isArray(r.links) ? r.links : [], sentAt: r.sentAt, createdAt: r.createdAt, updatedAt: r.updatedAt, canAnswer: ['sent', 'reviewing', 'changes'].includes(r.status) })

const commentOut = (c, all, contactId) => {
    const r = c.replyToId ? all.find((x) => x.id === c.replyToId) : null
    const sys = c.authorKind === 'system' ? c.body.split(':') : null
    return {
        id: c.id, authorKind: c.authorKind, authorName: c.authorName || '', body: sys ? '' : c.body, createdAt: c.createdAt, edited: !!c.editedAt, mine: c.authorKind === 'client' && c.authorId === contactId,
        system: sys ? { from: sys[1], to: sys[2] } : null,
        replyTo: r && !sys ? { id: r.id, name: r.authorName || '', text: plainText(r.body).replace(/\s+/g, ' ').slice(0, 120) } : null,
    }
}

async function tellTeam(r, clientId, text, byName) {
    const link = `/crm/clients/${clientId}?tab=reports&report=${r.id}`
    const admins = await prisma.crmCustomerAdmin.findMany({ where: { clientId }, select: { staffId: true } })
    for (const staffId of [...new Set([...(r.assigneeIds || []), r.createdBy, ...admins.map((a) => a.staffId)].filter(Boolean))]) {
        const st = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { active: true } })
        if (!st?.active) continue
        await prisma.crmNotification.create({ data: { toUserId: staffId, fromFullName: byName || 'Client', description: text.slice(0, 200), link, additionalData: 'client-report', isRead: false } }).catch(() => {})
        await notifyNotice(staffId, { kind: 'request', headlineKey: 'clientWrote', relType: 'customer', relId: clientId, link, note: text }).catch(() => {})
    }
}

const mine = async (s, id) => {
    const r = oid(id) && (await prisma.crmClientReport.findFirst({ where: { id, clientId: s.client.id } }))
    if (!r || !shown(r)) throw httpError('Not found', 404)
    return r
}

export async function listReports() {
    const s = await requirePortal('reports')
    const rows = (await prisma.crmClientReport.findMany({ where: { clientId: s.client.id }, orderBy: { updatedAt: 'desc' }, take: 300 })).filter(shown)
    return { list: rows.map(forClient), waiting: rows.filter((r) => forClient(r).canAnswer).length, kinds: KINDS, statuses: STATUS_LABEL, priorities: PRIORITIES }
}

export async function getReport(id) {
    const s = await requirePortal('reports')
    const r = await mine(s, id)
    const comments = await prisma.crmClientReportComment.findMany({ where: { reportId: id }, orderBy: { createdAt: 'asc' }, take: 400 })
    const open = comments.filter((c) => !c.internal)
    return { report: forClient(r), kinds: KINDS, statuses: STATUS_LABEL, comments: open.map((c) => commentOut(c, open, s.contact.id)) }
}

export async function commentReport(id, body = {}) {
    const s = await requirePortal('reports')
    guard(s)
    rateLimit(`portal-report-comment:${s.contact.id}`, 60, 3600000)
    const r = await mine(s, id)
    const text = storeRich(String(body.body || ''), 8000)
    if (!text) throw httpError('Write a message first')
    const reply = oid(body.replyToId) && (await prisma.crmClientReportComment.findFirst({ where: { id: body.replyToId, reportId: id, internal: false } }))
    const name = who(s.contact)
    const c = await prisma.crmClientReportComment.create({ data: { reportId: id, authorKind: 'client', authorId: s.contact.id, authorName: name, body: text, replyToId: reply ? reply.id : null } })
    await tellTeam(r, s.client.id, `${s.client.company || name} wrote on ${codeOf(r.seq, r.kind)} “${r.title}”: ${plainText(text).slice(0, 120)}`, name)
    const all = await prisma.crmClientReportComment.findMany({ where: { reportId: id, internal: false } })
    return { comment: commentOut(c, all, s.contact.id) }
}

export async function changeComment(id, body = {}, remove = false) {
    const s = await requirePortal('reports')
    guard(s)
    await mine(s, id)
    const c = oid(body.commentId) && (await prisma.crmClientReportComment.findFirst({ where: { id: body.commentId, reportId: id, authorKind: 'client', authorId: s.contact.id, internal: false } }))
    if (!c) throw httpError('Message not found', 404)
    if (remove) {
        await prisma.crmClientReportComment.updateMany({ where: { replyToId: c.id }, data: { replyToId: null } })
        await prisma.crmClientReportComment.delete({ where: { id: c.id } })
        return { success: true }
    }
    const text = storeRich(String(body.body || ''), 8000)
    if (!text) throw httpError('Write a message first')
    await prisma.crmClientReportComment.update({ where: { id: c.id }, data: { body: text, editedAt: new Date() } })
    return { success: true }
}

/** The client's answer to a report or a strategy: approve it, ask for changes or decline it. The team is told. */
export async function answerReport(id, body = {}) {
    const s = await requirePortal('reports')
    guard(s)
    const r = await mine(s, id)
    const to = ANSWERS[body.answer]
    if (!to) throw httpError('Unknown answer')
    if (!forClient(r).canAnswer && !(isOpen(r.status))) throw httpError('This one is already closed', 409)
    const name = who(s.contact)
    const row = await prisma.crmClientReport.update({ where: { id }, data: { status: to, statusChangedAt: new Date() } })
    await prisma.crmClientReportComment.create({ data: { reportId: id, authorKind: 'system', authorName: name, body: `status:${r.status}:${to}` } })
    const text = storeRich(String(body.comment || ''), 8000)
    if (text) await prisma.crmClientReportComment.create({ data: { reportId: id, authorKind: 'client', authorId: s.contact.id, authorName: name, body: text } })
    await tellTeam(row, s.client.id, `${s.client.company || name}: ${STATUS_LABEL[to]} · ${codeOf(row.seq, row.kind)} “${row.title}”${text ? ` · ${plainText(text).slice(0, 100)}` : ''}`, name)
    return { success: true, status: to }
}
