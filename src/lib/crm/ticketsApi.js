import { realPicture } from '@/lib/crm/pictures'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { sendTemplate } from '@/lib/crm/mailer'
import { readSettings } from '@/lib/crm/appSettings'
import { publicBase } from '@/lib/crm/shortLinks'
import { attachmentOut, prepareFiles, saveTicketFiles } from '@/lib/crm/ticketFiles'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const NONE = '000000000000000000000000'
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())

async function access(session) {
    const authority = session.user.authority || []
    const staffId = await getStaffId(session)
    const S = await readSettings(['staff_access_only_assigned_departments', 'allow_non_admin_members_to_delete_tickets_and_replies', 'ticket_replies_order', 'automatically_assign_ticket_to_first_staff_responding'])
    // Settings → Support: members only see the tickets of the departments they belong to (administrators see all)
    const deptIds = S.on('staff_access_only_assigned_departments') && !isCrmAdmin(authority) ? (staffId ? (await prisma.crmStaffDepartment.findMany({ where: { staffId }, select: { departmentId: true } })).map((x) => x.departmentId) : []) : null
    return { authority, scope: viewScope(authority, 'tickets'), staffId, session, S, deptIds, can: (cap) => hasCap(authority, 'tickets', cap) }
}
// "view own" staff see tickets assigned to them or opened by them
const visible = (a) => {
    const own = a.scope === 'all' ? {} : a.staffId ? { OR: [{ assignedId: a.staffId }, { adminId: a.staffId }] } : { id: NONE }
    return a.deptIds ? { AND: [own, { departmentId: { in: a.deptIds.length ? a.deptIds : [NONE] } }] } : own
}
/** Deleting: people with the delete permission, and (Settings → Support) members who can edit tickets when the switch is on. */
const mayDelete = (a) => isCrmAdmin(a.authority) || a.can('delete') || (a.S.on('allow_non_admin_members_to_delete_tickets_and_replies') && a.can('edit'))

const staffName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'
async function staffMap(ids) {
    const list = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(ids.filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }) : []
    return Object.fromEntries(list.map((s) => [s.id, { id: s.id, name: staffName(s), image: realPicture(s.profileImage) }]))
}
const contactName = (c) => (c ? [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email : null)
const stripHtml = (h) => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()

// Perfex stores ticket messages as HTML; staff write plain text here. Escape plain text, keep legacy HTML.
const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const toHtml = (t) => (/<[a-z][\s\S]*>/i.test(t) ? t : esc(t).replace(/\r?\n/g, '<br />'))

/** Email text: the message followed by the links of the files that came with it. */
export const withFiles = (text, files) => (files?.length ? `${text}${text ? '\n\n' : ''}Attachments:\n${files.map((f) => `- ${f.fileName}: ${f.url}`).join('\n')}` : text)

async function lookups() {
    const [statuses, priorities, departments, services, staff, predefined] = await Promise.all([
        prisma.crmTicketStatus.findMany({ orderBy: { statusOrder: 'asc' } }),
        prisma.crmTicketPriority.findMany({ orderBy: { legacyId: 'asc' } }),
        prisma.crmDepartment.findMany({ where: { NOT: { isActive: false } }, orderBy: [{ departmentOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
        prisma.crmService.findMany({ orderBy: { name: 'asc' } }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }),
        prisma.crmPredefinedReply.findMany({ orderBy: { name: 'asc' } }),
    ])
    return {
        statuses: statuses.map((s) => ({ id: s.id, name: s.name, color: s.statusColor || '#64748b', legacyId: s.legacyId, isDefault: s.isDefault })),
        priorities: priorities.map((p) => ({ id: p.id, name: p.name })), departments, services: services.map((s) => ({ id: s.id, name: s.name })),
        staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })).sort((x, y) => x.name.localeCompare(y.name)),
        predefined: predefined.map((r) => ({ id: r.id, name: r.name, message: stripHtml(r.message) })),
    }
}
export async function ticketLookups() { await requirePermission('tickets', 'view'); return lookups() }

export async function listTickets(q = {}) {
    const session = await requirePermission('tickets', 'view')
    const a = await access(session)
    const and = [await visible(a)]
    if (oid(q.statusId)) and.push({ statusId: q.statusId })
    if (q.open === '1') { const closed = await prisma.crmTicketStatus.findMany({ where: { legacyId: 5 }, select: { id: true } }); and.push({ statusId: { notIn: closed.map((c) => c.id) } }) }
    if (oid(q.priorityId)) and.push({ priorityId: q.priorityId })
    if (oid(q.departmentId)) and.push({ departmentId: q.departmentId })
    if (oid(q.assignedId)) and.push({ assignedId: q.assignedId })
    if (oid(q.clientId)) and.push({ clientId: q.clientId })
    if (q.mine === '1' && a.staffId) and.push({ assignedId: a.staffId })
    if (q.from || q.to) and.push({ createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(`${q.to}T23:59:59.999`) } : {}) } })
    if (q.query) {
        const c = { contains: q.query, mode: 'insensitive' }
        const num = parseInt(q.query.replace('#', ''), 10)
        and.push({ OR: [{ subject: c }, { email: c }, { name: c }, ...(Number.isFinite(num) ? [{ legacyId: num }] : [])] })
    }
    const page = Math.max(parseInt(q.pageIndex, 10) || 1, 1), size = Math.min(Math.max(parseInt(q.pageSize, 10) || 20, 5), 100)
    const where = { AND: and }
    const [rows, total, lk] = await Promise.all([
        prisma.crmTicket.findMany({ where, orderBy: [{ lastReply: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * size, take: size, include: { _count: { select: { replies: true, attachments: true } } } }),
        prisma.crmTicket.count({ where }), lookups(),
    ])
    const st = Object.fromEntries(lk.statuses.map((s) => [s.id, s])), pr = Object.fromEntries(lk.priorities.map((p) => [p.id, p])), dp = Object.fromEntries(lk.departments.map((d) => [d.id, d]))
    const [clients, contacts] = await Promise.all([
        prisma.crmClient.findMany({ where: { id: { in: rows.map((r) => r.clientId).filter(Boolean) } }, select: { id: true, company: true } }),
        prisma.crmContact.findMany({ where: { id: { in: rows.map((r) => r.contactId).filter(Boolean) } }, select: { id: true, firstName: true, lastName: true, email: true } }),
    ])
    const cMap = Object.fromEntries(clients.map((c) => [c.id, c.company])), kMap = Object.fromEntries(contacts.map((c) => [c.id, c]))
    const people = await staffMap(rows.map((r) => r.assignedId))
    const counts = {}
    for (const s of lk.statuses) counts[s.id] = await prisma.crmTicket.count({ where: { AND: [await visible(a), { statusId: s.id }] } })
    return {
        list: rows.map((t) => ({
            id: t.id, number: t.legacyId, subject: t.subject || '(no subject)', client: t.clientId ? { id: t.clientId, name: cMap[t.clientId] || '' } : null, contact: contactName(kMap[t.contactId]) || t.name || t.email || '',
            department: dp[t.departmentId]?.name || '', status: st[t.statusId] || null, priority: pr[t.priorityId]?.name || '', assigned: people[t.assignedId] || null,
            lastReply: t.lastReply, createdAt: t.createdAt, unread: !t.adminRead, replies: t._count.replies, files: t._count.attachments,
        })),
        total, pageIndex: page, pageSize: size, counts, statuses: lk.statuses, priorities: lk.priorities, departments: lk.departments, staff: lk.staff,
        can: { create: a.can('create'), edit: a.can('edit'), delete: mayDelete(a) },
    }
}

async function loadOne(id, a) {
    if (!oid(id)) throw fail('Ticket not found', 404)
    const t = await prisma.crmTicket.findFirst({ where: { AND: [{ id }, visible(a)] } })
    if (!t) throw fail('Ticket not found', 404)
    return t
}

export async function getTicket(id) {
    const session = await requirePermission('tickets', 'view')
    const a = await access(session)
    const t = await loadOne(id, a)
    const [replies, attachments, lk, client, contact, project] = await Promise.all([
        prisma.crmTicketReply.findMany({ where: { ticketId: id }, orderBy: { createdAt: 'asc' } }),
        prisma.crmTicketAttachment.findMany({ where: { ticketId: id } }),
        lookups(),
        t.clientId ? prisma.crmClient.findUnique({ where: { id: t.clientId }, select: { id: true, company: true } }) : null,
        t.contactId ? prisma.crmContact.findUnique({ where: { id: t.contactId }, select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } }) : null,
        t.projectId ? prisma.crmProject.findUnique({ where: { id: t.projectId }, select: { id: true, name: true } }) : null,
    ])
    if (!t.adminRead) await prisma.crmTicket.update({ where: { id }, data: { adminRead: 1 } })
    const people = await staffMap([t.assignedId, t.adminId, ...replies.map((r) => r.adminId)])
    const rc = await prisma.crmContact.findMany({ where: { id: { in: replies.map((r) => r.contactId).filter(Boolean) } }, select: { id: true, firstName: true, lastName: true, email: true } })
    const rcMap = Object.fromEntries(rc.map((c) => [c.id, c]))
    const att = (rid) => attachments.filter((x) => (x.replyId || null) === rid).map(attachmentOut)
    const thread = [
        { id: 'first', staff: people[t.adminId] || null, name: people[t.adminId]?.name || contactName(contact) || t.name || t.email || 'Client', html: toHtml(t.message || ''), date: t.createdAt, attachments: att(null), first: true },
        ...(a.S.on('ticket_replies_order') ? [...replies].reverse() : replies).map((r) => ({ id: r.id, staff: people[r.adminId] || null, name: people[r.adminId]?.name || r.name || contactName(rcMap[r.contactId]) || contactName(contact) || r.email || 'Client', html: toHtml(r.message || ''), date: r.createdAt, attachments: att(r.id), first: false, internal: !!r.internal })),
    ]
    return {
        ticket: {
            id: t.id, number: t.legacyId, subject: t.subject || '', statusId: t.statusId, priorityId: t.priorityId, departmentId: t.departmentId, serviceId: t.serviceId, assignedId: t.assignedId, projectId: t.projectId, cc: t.cc || '',
            createdAt: t.createdAt, lastReply: t.lastReply, email: t.email, client, contact: contact ? { id: contact.id, name: contactName(contact), email: contact.email, phone: contact.phoneNumber } : t.email ? { name: t.name || t.email, email: t.email } : null, project,
            assigned: people[t.assignedId] || null,
        },
        thread, lookups: lk, can: { reply: a.can('edit'), edit: a.can('edit'), delete: mayDelete(a) }, closedStatusId: lk.statuses.find((s) => s.legacyId === 5)?.id || null, openStatusId: lk.statuses.find((s) => s.legacyId === 1)?.id || null,
    }
}

export async function mailVars(t, extra = {}) {
    const [dept, prio, status] = await Promise.all([
        t.departmentId ? prisma.crmDepartment.findUnique({ where: { id: t.departmentId }, select: { name: true } }) : null,
        t.priorityId ? prisma.crmTicketPriority.findUnique({ where: { id: t.priorityId }, select: { name: true } }) : null,
        t.statusId ? prisma.crmTicketStatus.findUnique({ where: { id: t.statusId }, select: { name: true } }) : null,
    ])
    return { ticket_id: String(t.legacyId ?? ''), ticket_subject: t.subject || '', ticket_department: dept?.name || '', ticket_priority: prio?.name || '', ticket_status: status?.name || '', ticket_message: extra.message || '', ticket_url: extra.staffUrl ? `${publicBase()}/crm/tickets/${t.id}` : `${publicBase()}/portal/tickets/${t.id}`, ...extra.vars }
}

async function clientEmail(t) {
    if (t.contactId) { const c = await prisma.crmContact.findUnique({ where: { id: t.contactId }, select: { email: true } }); if (c?.email) return c.email }
    return t.email || null
}
/** The greeting name for the client's emails. */
const clientFirst = async (t) => (t.contactId ? (await prisma.crmContact.findUnique({ where: { id: t.contactId }, select: { firstName: true } }))?.firstName : null) || (t.name || '').split(' ')[0] || ''

async function nextNumber() {
    const last = await prisma.crmTicket.findFirst({ where: { legacyId: { not: null } }, orderBy: { legacyId: 'desc' }, select: { legacyId: true } })
    return (last?.legacyId || 0) + 1
}

export async function createTicket(body, files = []) {
    const session = await requirePermission('tickets', 'create')
    const a = await access(session)
    const subject = nz(body.subject), message = nz(body.message)
    if (!subject) throw fail('Give the ticket a subject')
    if (!message && !(files || []).some((f) => f && f.size > 0)) throw fail('Write the message')
    if (!oid(body.clientId) && !nz(body.email)) throw fail('Choose a client or enter an email address')
    const prepared = await prepareFiles(files)
    const lk = await lookups()
    const def = lk.statuses.find((s) => s.isDefault) || lk.statuses.find((s) => s.legacyId === 1) || lk.statuses[0]
    const t = await prisma.crmTicket.create({
        data: {
            legacyId: await nextNumber(), clientId: oid(body.clientId), contactId: oid(body.contactId), email: nz(body.email), name: nz(body.name), departmentId: oid(body.departmentId), priorityId: oid(body.priorityId) || lk.priorities.find((p) => /medium/i.test(p.name))?.id || null,
            statusId: oid(body.statusId) || def?.id || null, serviceId: oid(body.serviceId), subject, message: toHtml(message || ''), adminId: a.staffId, projectId: oid(body.projectId), assignedId: oid(body.assignedId), cc: nz(body.cc),
            ticketKey: crypto.randomBytes(16).toString('hex'), adminRead: 1, clientRead: 0, lastReply: null,
        },
    })
    const saved = await saveTicketFiles({ ticketId: t.id, prepared, uploaderId: a.staffId, uploaderName: a.session.user.name || a.session.user.email })
    const sent = { client: null, staff: null }
    if (body.notifyClient) { const to = await clientEmail(t); if (to) sent.client = await sendTemplate({ slug: 'ticket-autoresponse', to, data: await mailVars(t, { message: withFiles(stripHtml(t.message), saved), vars: { contact_firstname: await clientFirst(t) } }), relType: 'ticket', relId: t.id }) }
    if (t.assignedId && t.assignedId !== a.staffId) { const s = await prisma.crmStaff.findUnique({ where: { id: t.assignedId }, select: { email: true } }); if (s?.email) sent.staff = await sendTemplate({ slug: 'ticket-assigned-to-admin', to: s.email, data: await mailVars(t, { message: stripHtml(t.message), staffUrl: true }), relType: 'ticket', relId: t.id }) }
    return { success: true, id: t.id, number: t.legacyId, mail: sent, files: saved.length }
}

export async function updateTicket(id, body) {
    const session = await requirePermission('tickets', 'edit')
    const a = await access(session)
    const t = await loadOne(id, a)
    const data = {}
    for (const k of ['statusId', 'priorityId', 'departmentId', 'serviceId', 'assignedId', 'projectId']) if (k in body) data[k] = oid(body[k])
    if ('subject' in body) { const s = nz(body.subject); if (!s) throw fail('The subject cannot be empty'); data.subject = s }
    if ('cc' in body) data.cc = nz(body.cc)
    await prisma.crmTicket.update({ where: { id }, data })
    if (data.assignedId && data.assignedId !== t.assignedId && data.assignedId !== a.staffId) {
        const s = await prisma.crmStaff.findUnique({ where: { id: data.assignedId }, select: { email: true } })
        if (s?.email) await sendTemplate({ slug: 'ticket-assigned-to-admin', to: s.email, data: await mailVars({ ...t, ...data }, { message: stripHtml(t.message), staffUrl: true }), relType: 'ticket', relId: id })
    }
    return { success: true }
}

export async function replyTicket(id, { message, statusId, notify = true, internal = false, close = false } = {}, files = []) {
    const session = await requirePermission('tickets', 'edit')
    const a = await access(session)
    const t = await loadOne(id, a)
    const text = nz(message)
    const prepared = await prepareFiles(files)
    if (!text && !prepared.length) throw fail('Write your reply first')
    const lk = await lookups()
    const who = a.session.user.name || a.session.user.email || null
    const r = await prisma.crmTicketReply.create({ data: { ticketId: id, adminId: a.staffId, message: toHtml(text || ''), name: a.session.user.name || null, email: a.session.user.email || null, internal: !!internal } })
    const saved = await saveTicketFiles({ ticketId: id, replyId: r.id, prepared, uploaderId: a.staffId, uploaderName: who })
    // an internal note never changes the status, never counts as a reply to the client and is never emailed
    if (internal) return { success: true, id: r.id, mail: null, files: saved.length }
    const answered = lk.statuses.find((s) => s.legacyId === 3)
    const closed = lk.statuses.find((s) => s.legacyId === 5)
    const nextStatus = close && closed ? closed.id : oid(statusId) || answered?.id || t.statusId
    await prisma.crmTicket.update({ where: { id }, data: { statusId: nextStatus, lastReply: new Date(), clientRead: 0, adminRead: 1, ...(t.assignedId || !a.S.on('automatically_assign_ticket_to_first_staff_responding') ? {} : { assignedId: a.staffId }) } })
    let mail = null
    if (notify) { const to = await clientEmail(t); if (to) mail = await sendTemplate({ slug: 'ticket-reply', to, data: await mailVars({ ...t, statusId: nextStatus }, { message: withFiles(text || '', saved), vars: { contact_firstname: await clientFirst(t) } }), relType: 'ticket', relId: id }) }
    return { success: true, id: r.id, mail, files: saved.length }
}

export async function deleteReply(id, replyId) {
    const session = await requirePermission('tickets', 'view')
    const a = await access(session)
    if (!mayDelete(a)) throw fail('Forbidden', 403)
    await loadOne(id, a)
    const r = oid(replyId) && (await prisma.crmTicketReply.findFirst({ where: { id: replyId, ticketId: id } }))
    if (!r) throw fail('Reply not found', 404)
    await prisma.crmTicketReply.delete({ where: { id: replyId } })
    return { success: true }
}

export async function deleteTicket(id) {
    const session = await requirePermission('tickets', 'view')
    const a = await access(session)
    if (!mayDelete(a)) throw fail('Forbidden', 403)
    await loadOne(id, a)
    await prisma.crmTicket.delete({ where: { id } })
    return { success: true }
}

/** Contacts of a client, for the new-ticket form. */
export async function clientContacts(clientId) {
    await requirePermission('tickets', 'view')
    if (!oid(clientId)) return { list: [] }
    const c = await prisma.crmContact.findMany({ where: { clientId }, select: { id: true, firstName: true, lastName: true, email: true, isPrimary: true } })
    return { list: c.map((x) => ({ id: x.id, name: contactName(x), email: x.email, primary: !!x.isPrimary })) }
}
