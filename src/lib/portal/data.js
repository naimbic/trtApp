import prisma from '@/lib/prisma'
import { requirePortal } from '@/lib/portal/session'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { numberFormatter as proposalNumber } from '@/lib/crm/proposalDoc'
import { round2 } from '@/lib/crm/sales/calc'
import { publicBase } from '@/lib/crm/shortLinks'

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const INV = { 1: 'Unpaid', 2: 'Paid', 3: 'Partially paid', 4: 'Overdue', 5: 'Cancelled', 6: 'Draft' }
const EST = { 1: 'Draft', 2: 'Sent', 3: 'Declined', 4: 'Accepted', 5: 'Expired' }
const PROP = { 1: 'Open', 2: 'Declined', 3: 'Accepted', 4: 'Sent', 5: 'Revised', 6: 'Draft' }
const PROJ = { 1: 'Not started', 2: 'In progress', 3: 'On hold', 4: 'Finished', 5: 'Cancelled' }
const TASK = { 1: 'Not started', 2: 'Awaiting feedback', 3: 'Testing', 4: 'In progress', 5: 'Complete' }
const pub = (type, id, hash) => `/api/crm/public/${type}/${id}/${hash}`

const currencies = async () => Object.fromEntries((await prisma.crmCurrency.findMany()).map((c) => [c.id, { name: c.name, symbol: c.symbol, placement: c.placement }]))

export async function me() {
    const s = await requirePortal()
    const c = s.contact
    const co = await prisma.crmOption.findMany({ where: { name: { in: ['companyname', 'company_logo', 'company_logo_dark'] } } })
    const o = Object.fromEntries(co.map((x) => [x.name, x.value]))
    return { contact: { id: c.id, firstName: c.firstName, lastName: c.lastName, name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email, email: c.email, phone: c.phoneNumber, title: c.title, image: c.profileImage || null }, client: { id: s.client.id, company: s.client.company, logoUrl: s.client.logoUrl || null }, can: s.can, company: { name: o.companyname || '', logo: /^https?:/.test(o.company_logo || '') ? o.company_logo : null } }
}

async function invoicesOf(clientId) {
    const [rows, cur, padding] = await Promise.all([prisma.crmInvoice.findMany({ where: { clientId, status: { not: 6 } }, orderBy: { date: 'desc' } }), currencies(), numberPadding()])
    const pays = rows.length ? await prisma.crmPayment.findMany({ where: { invoiceId: { in: rows.map((r) => r.id) } }, select: { invoiceId: true, amount: true } }) : []
    const paid = {}
    for (const p of pays) paid[p.invoiceId] = round2((paid[p.invoiceId] || 0) + (p.amount || 0))
    const today = new Date(new Date().toDateString())
    return rows.map((i) => {
        const p = paid[i.id] || 0, due = i.status === 5 ? 0 : round2(Math.max(i.total - p, 0))
        const st = i.status === 5 ? 5 : due <= 0 ? 2 : p > 0 && (!i.dueDate || new Date(i.dueDate) >= today) ? 3 : i.dueDate && new Date(i.dueDate) < today ? 4 : 1
        return { id: i.id, number: docNumberOf(i, padding), date: i.date, dueDate: i.dueDate, total: i.total, paid: p, due, status: st, statusLabel: INV[st], currency: cur[i.currencyId] || null, currencyId: i.currencyId, link: pub('invoice', i.id, i.hash), pdf: `${pub('invoice', i.id, i.hash)}/pdf` }
    })
}

export async function dashboard() {
    const s = await requirePortal()
    const id = s.client.id
    const out = { can: s.can, money: [], invoices: [], estimates: [], proposals: [], projects: [], tickets: [], actions: [] }
    if (s.can.includes('invoices')) {
        const inv = await invoicesOf(id)
        const by = {}
        for (const i of inv) { const m = (by[i.currencyId || 'none'] ||= { currency: i.currency, invoiced: 0, paid: 0, due: 0, overdue: 0 }); m.invoiced = round2(m.invoiced + i.total); m.paid = round2(m.paid + i.paid); m.due = round2(m.due + i.due); if (i.status === 4) m.overdue = round2(m.overdue + i.due) }
        out.money = Object.values(by)
        out.invoices = inv.slice(0, 6)
        out.actions.push(...inv.filter((i) => i.due > 0).slice(0, 4).map((i) => ({ kind: i.status === 4 ? 'overdue' : 'invoice', title: `Invoice ${i.number} ${i.status === 4 ? 'is overdue' : 'is waiting for payment'}`, detail: `${i.due.toFixed(2)} ${i.currency?.symbol || ''} left`, link: i.link, external: true })))
    }
    if (s.can.includes('estimates')) {
        const padding = await numberPadding()
        const es = await prisma.crmEstimate.findMany({ where: { clientId: id, status: { not: 1 } }, orderBy: { date: 'desc' }, take: 6 })
        out.estimates = es.map((e) => ({ id: e.id, number: docNumberOf(e, padding, 1), date: e.date, total: e.total, status: e.status, statusLabel: EST[e.status], link: pub('estimate', e.id, e.hash) }))
        out.actions.push(...out.estimates.filter((e) => e.status === 2).map((e) => ({ kind: 'estimate', title: `Estimate ${e.number} is waiting for your answer`, detail: '', link: e.link, external: true })))
    }
    if (s.can.includes('proposals')) {
        const fmt = await proposalNumber()
        const ps = await prisma.crmProposal.findMany({ where: { relType: 'customer', relId: id, status: { not: 6 } }, orderBy: { createdAt: 'desc' }, take: 6 })
        out.proposals = ps.map((p) => ({ id: p.id, number: fmt(p), subject: p.subject, total: p.total, status: p.status, statusLabel: PROP[p.status], link: pub('proposal', p.id, p.hash) }))
        out.actions.push(...out.proposals.filter((p) => [1, 4, 5].includes(p.status)).map((p) => ({ kind: 'proposal', title: `Proposal ${p.number} is waiting for your answer`, detail: p.subject || '', link: p.link, external: true })))
    }
    if (s.can.includes('projects')) out.projects = (await listProjects()).list.slice(0, 5)
    if (s.can.includes('support')) out.tickets = (await listTickets()).list.slice(0, 5)
    return out
}

export async function listInvoices() { const s = await requirePortal('invoices'); return { list: await invoicesOf(s.client.id) } }

export async function listEstimates() {
    const s = await requirePortal('estimates')
    const [rows, padding, cur] = await Promise.all([prisma.crmEstimate.findMany({ where: { clientId: s.client.id, status: { not: 1 } }, orderBy: { date: 'desc' } }), numberPadding(), currencies()])
    return { list: rows.map((e) => ({ id: e.id, number: docNumberOf(e, padding, 1), date: e.date, expiryDate: e.expiryDate, total: e.total, currency: cur[e.currencyId] || null, status: e.status, statusLabel: EST[e.status], link: pub('estimate', e.id, e.hash), pdf: `${pub('estimate', e.id, e.hash)}/pdf` })) }
}

export async function listProposals() {
    const s = await requirePortal('proposals')
    const [rows, fmt, cur] = await Promise.all([prisma.crmProposal.findMany({ where: { relType: 'customer', relId: s.client.id, status: { not: 6 } }, orderBy: { createdAt: 'desc' } }), proposalNumber(), currencies()])
    return { list: rows.map((p) => ({ id: p.id, number: fmt(p), subject: p.subject, date: p.date, openTill: p.openTill, total: p.total, currency: cur[p.currencyId] || null, status: p.status, statusLabel: PROP[p.status], link: pub('proposal', p.id, p.hash), pdf: `${pub('proposal', p.id, p.hash)}/pdf` })) }
}

export async function listProjects() {
    const s = await requirePortal('projects')
    const projects = await prisma.crmProject.findMany({ where: { clientId: s.client.id }, orderBy: { createdAt: 'desc' } })
    const tasks = projects.length ? await prisma.crmTask.findMany({ where: { relType: 'project', relId: { in: projects.map((p) => p.id) }, visibleToClient: true }, select: { relId: true, status: true } }) : []
    return { list: projects.map((p) => { const t = tasks.filter((x) => x.relId === p.id), done = t.filter((x) => x.status === 5).length; return { id: p.id, name: p.name, status: p.status, statusLabel: PROJ[p.status], startDate: p.startDate, deadline: p.deadline, progress: p.status === 4 ? 100 : t.length ? Math.round((done / t.length) * 100) : p.progressFromTasks ? 0 : p.progress || 0, tasks: t.length, done } }) }
}

export async function getProject(id) {
    const s = await requirePortal('projects')
    const p = oid(id) && (await prisma.crmProject.findFirst({ where: { id, clientId: s.client.id } }))
    if (!p) throw httpError('Project not found', 404)
    const [tasks, milestones, files] = await Promise.all([
        prisma.crmTask.findMany({ where: { relType: 'project', relId: id, visibleToClient: true }, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], select: { id: true, name: true, status: true, dueDate: true, startDate: true, milestoneId: true } }),
        prisma.crmMilestone.findMany({ where: { projectId: id }, orderBy: { milestoneOrder: 'asc' } }),
        prisma.crmProjectFile.findMany({ where: { projectId: id, visibleToCustomer: true }, orderBy: { createdAt: 'desc' }, select: { id: true, subject: true, fileName: true, createdAt: true } }),
    ])
    const done = tasks.filter((t) => t.status === 5).length
    return {
        project: { id: p.id, name: p.name, description: p.description || '', status: p.status, statusLabel: PROJ[p.status], startDate: p.startDate, deadline: p.deadline, progress: p.status === 4 ? 100 : tasks.length ? Math.round((done / tasks.length) * 100) : p.progress || 0 },
        tasks: tasks.map((t) => ({ ...t, statusLabel: TASK[t.status] })), milestones: milestones.map((m) => ({ id: m.id, name: m.name, dueDate: m.dueDate, color: m.color })),
        files: files.map((f) => ({ id: f.id, name: f.subject || f.fileName, date: f.createdAt })),
    }
}

// ---------------------------------------------------------------- support
const stripHtml = (h) => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const toHtml = (t) => esc(t).replace(/\r?\n/g, '<br />')

export async function listTickets() {
    const s = await requirePortal('support')
    const [rows, statuses, prios, depts] = await Promise.all([prisma.crmTicket.findMany({ where: { clientId: s.client.id }, orderBy: [{ lastReply: 'desc' }, { createdAt: 'desc' }] }), prisma.crmTicketStatus.findMany(), prisma.crmTicketPriority.findMany(), prisma.crmDepartment.findMany({ select: { id: true, name: true } })])
    const st = Object.fromEntries(statuses.map((x) => [x.id, x])), pr = Object.fromEntries(prios.map((x) => [x.id, x.name])), dp = Object.fromEntries(depts.map((x) => [x.id, x.name]))
    return { list: rows.map((t) => ({ id: t.id, number: t.legacyId, subject: t.subject || '(no subject)', status: st[t.statusId] ? { name: st[t.statusId].name, color: st[t.statusId].statusColor || '#64748b', closed: st[t.statusId].legacyId === 5 } : null, priority: pr[t.priorityId] || '', department: dp[t.departmentId] || '', lastReply: t.lastReply, createdAt: t.createdAt, unread: t.clientRead === 0 && !!t.lastReply })), departments: depts.map((d) => ({ id: d.id, name: d.name })), priorities: prios.slice(0, 3).map((p) => ({ id: p.id, name: p.name })) }
}

export async function getTicket(id) {
    const s = await requirePortal('support')
    const t = oid(id) && (await prisma.crmTicket.findFirst({ where: { id, clientId: s.client.id } }))
    if (!t) throw httpError('Ticket not found', 404)
    const [replies, atts, status, staff] = await Promise.all([prisma.crmTicketReply.findMany({ where: { ticketId: id }, orderBy: { createdAt: 'asc' } }), prisma.crmTicketAttachment.findMany({ where: { ticketId: id } }), t.statusId ? prisma.crmTicketStatus.findUnique({ where: { id: t.statusId } }) : null, prisma.crmStaff.findMany({ select: { id: true, firstName: true } })])
    if (!t.clientRead) await prisma.crmTicket.update({ where: { id }, data: { clientRead: 1 } })
    const sf = Object.fromEntries(staff.map((x) => [x.id, x.firstName]))
    const att = (rid) => atts.filter((a) => (a.replyId || null) === rid).map((a) => ({ id: a.id, name: a.fileName }))
    const who = (r) => (r.adminId ? `${sf[r.adminId] || 'Support'} · support team` : r.name || [s.contact.firstName, s.contact.lastName].filter(Boolean).join(' ') || 'You')
    return {
        ticket: { id: t.id, number: t.legacyId, subject: t.subject, createdAt: t.createdAt, closed: status?.legacyId === 5, status: status ? { name: status.name, color: status.statusColor || '#64748b' } : null },
        thread: [{ id: 'first', staff: !!t.adminId, name: t.adminId ? `${sf[t.adminId] || 'Support'} · support team` : [s.contact.firstName, s.contact.lastName].filter(Boolean).join(' ') || 'You', html: /<[a-z][\s\S]*>/i.test(t.message || '') ? t.message : toHtml(t.message), date: t.createdAt, attachments: att(null) }, ...replies.map((r) => ({ id: r.id, staff: !!r.adminId, name: who(r), html: /<[a-z][\s\S]*>/i.test(r.message || '') ? r.message : toHtml(r.message), date: r.createdAt, attachments: att(r.id) }))],
    }
}

export async function createTicket(body) {
    const s = await requirePortal('support')
    const subject = String(body.subject || '').trim().slice(0, 200), message = String(body.message || '').trim().slice(0, 10000)
    if (!subject) throw httpError('Give your request a subject')
    if (!message) throw httpError('Describe what you need')
    const [statuses, prios] = await Promise.all([prisma.crmTicketStatus.findMany(), prisma.crmTicketPriority.findMany()])
    const open = statuses.find((x) => x.legacyId === 1) || statuses.find((x) => x.isDefault) || statuses[0]
    const last = await prisma.crmTicket.findFirst({ where: { legacyId: { not: null } }, orderBy: { legacyId: 'desc' }, select: { legacyId: true } })
    const prio = prios.find((p) => p.id === body.priorityId) || prios.find((p) => /medium/i.test(p.name))
    const t = await prisma.crmTicket.create({ data: { legacyId: (last?.legacyId || 0) + 1, clientId: s.client.id, contactId: s.contact.id, name: [s.contact.firstName, s.contact.lastName].filter(Boolean).join(' ') || null, email: s.contact.email, departmentId: oid(body.departmentId), priorityId: prio?.id || null, statusId: open?.id || null, subject, message: toHtml(message), ticketKey: (await import('node:crypto')).randomBytes(16).toString('hex'), adminRead: 0, clientRead: 1, lastReply: null } })
    return { success: true, id: t.id, number: t.legacyId }
}

export async function replyTicket(id, message) {
    const s = await requirePortal('support')
    const t = oid(id) && (await prisma.crmTicket.findFirst({ where: { id, clientId: s.client.id } }))
    if (!t) throw httpError('Ticket not found', 404)
    const text = String(message || '').trim().slice(0, 10000)
    if (!text) throw httpError('Write your reply first')
    const [statuses] = await Promise.all([prisma.crmTicketStatus.findMany()])
    const open = statuses.find((x) => x.legacyId === 1)
    await prisma.crmTicketReply.create({ data: { ticketId: id, contactId: s.contact.id, clientId: s.client.id, name: [s.contact.firstName, s.contact.lastName].filter(Boolean).join(' ') || null, email: s.contact.email, message: toHtml(text) } })
    await prisma.crmTicket.update({ where: { id }, data: { statusId: open?.id || t.statusId, lastReply: new Date(), adminRead: 0, clientRead: 1 } })
    return { success: true }
}

export async function updateProfile(body) {
    const s = await requirePortal()
    const data = {}
    if ('firstName' in body) data.firstName = String(body.firstName || '').trim().slice(0, 80) || null
    if ('lastName' in body) data.lastName = String(body.lastName || '').trim().slice(0, 80) || null
    if ('phone' in body) data.phoneNumber = String(body.phone || '').trim().slice(0, 40) || null
    if ('title' in body) data.title = String(body.title || '').trim().slice(0, 80) || null
    await prisma.crmContact.update({ where: { id: s.contact.id }, data })
    return { success: true }
}
void publicBase
