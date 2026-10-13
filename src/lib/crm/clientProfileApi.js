import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap } from '@/lib/crm/permissions'
import { scope } from '@/lib/crm/clientsApi'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { numberFormatter as proposalNumber } from '@/lib/crm/proposalDoc'
import { round2 } from '@/lib/crm/sales/calc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const name = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''
const strip = (h) => String(h || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const PROP = { 1: 'open', 2: 'declined', 3: 'accepted', 4: 'sent', 5: 'revised', 6: 'draft' }
const EST = { 1: 'draft', 2: 'sent', 3: 'declined', 4: 'accepted', 5: 'expired' }

async function load(id) {
    const session = await requirePermission('customers', 'view')
    const sc = await scope(session)
    const c = await prisma.crmClient.findFirst({ where: { AND: [{ id }, sc] } })
    if (!c) throw fail('Client not found', 404)
    return { session, c }
}

/** Everything the client profile adds on top of the basic record: lead origin, follow-up timeline, engagement, what needs attention. */
export async function clientProfile(id) {
    const { session, c } = await load(id)
    const authority = session.user.authority || []
    const can = (f, cap) => hasCap(authority, f, cap)
    const padding = await numberPadding()
    const fmtProposal = await proposalNumber()

    const [leadRow, contacts, invoices, estimates, proposals, contracts, projects, tickets, notes, reminders, tasks] = await Promise.all([
        c.leadId ? prisma.crmLead.findUnique({ where: { id: c.leadId } }) : prisma.crmLead.findFirst({ where: { clientId: id } }),
        prisma.crmContact.findMany({ where: { clientId: id }, select: { id: true, firstName: true, lastName: true, email: true, lastIp: true, lastLogin: true, isPrimary: true, active: true } }),
        prisma.crmInvoice.findMany({ where: { clientId: id }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, dueDate: true, total: true, status: true, currencyId: true, createdAt: true, dateSend: true, sent: true } }),
        prisma.crmEstimate.findMany({ where: { clientId: id }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true, total: true, createdAt: true, acceptanceDate: true } }),
        prisma.crmProposal.findMany({ where: { relType: 'customer', relId: id }, select: { id: true, number: true, legacyId: true, subject: true, status: true, total: true, createdAt: true, date: true, acceptanceDate: true, openTill: true } }),
        prisma.crmContract.findMany({ where: { clientId: id, trash: false }, select: { id: true, subject: true, dateStart: true, dateEnd: true, signed: true, createdAt: true } }),
        prisma.crmProject.findMany({ where: { clientId: id }, select: { id: true, name: true, status: true, createdAt: true, deadline: true } }),
        prisma.crmTicket.findMany({ where: { clientId: id }, select: { id: true, legacyId: true, subject: true, statusId: true, createdAt: true, lastReply: true } }),
        prisma.crmNote.findMany({ where: { relType: 'customer', relId: id }, orderBy: { createdAt: 'desc' } }),
        prisma.crmReminder.findMany({ where: { relType: 'customer', relId: id }, orderBy: { date: 'asc' } }),
        prisma.crmTask.findMany({ where: { relType: 'customer', relId: id }, select: { id: true, name: true, status: true, dueDate: true, createdAt: true, dateFinished: true } }),
    ])
    const invIds = invoices.map((i) => i.id)
    const [payments, views, leadNotes, leadActivity, closed] = await Promise.all([
        invIds.length ? prisma.crmPayment.findMany({ where: { invoiceId: { in: invIds } }, select: { id: true, invoiceId: true, amount: true, paymentDate: true, createdAt: true } }) : [],
        prisma.crmViewTracking.findMany({ where: { OR: [{ relType: 'invoice', relId: { in: invIds } }, { relType: 'estimate', relId: { in: estimates.map((e) => e.id) } }, { relType: 'proposal', relId: { in: proposals.map((p) => p.id) } }] }, orderBy: { createdAt: 'desc' }, take: 400 }),
        leadRow ? prisma.crmNote.findMany({ where: { relType: 'lead', relId: leadRow.id }, orderBy: { createdAt: 'asc' } }) : [],
        leadRow ? prisma.crmLeadActivityLog.findMany({ where: { leadId: leadRow.id }, orderBy: { createdAt: 'asc' } }) : [],
        prisma.crmTicketStatus.findMany({ where: { legacyId: 5 }, select: { id: true } }),
    ])
    const staffIds = [...new Set([leadRow?.assigned, leadRow?.addedFrom, ...notes.map((n) => n.addedFrom), ...leadNotes.map((n) => n.addedFrom), ...reminders.map((r) => r.staffId)].filter(Boolean))]
    const staff = staffIds.length ? await prisma.crmStaff.findMany({ where: { id: { in: staffIds } }, select: { id: true, firstName: true, lastName: true, email: true } }) : []
    const sName = Object.fromEntries(staff.map((s) => [s.id, name(s)]))
    const [leadStatus, leadSource] = await Promise.all([leadRow?.statusId ? prisma.crmLeadStatus.findUnique({ where: { id: leadRow.statusId } }) : null, leadRow?.sourceId ? prisma.crmLeadSource.findUnique({ where: { id: leadRow.sourceId } }) : null])

    const paidBy = {}
    for (const p of payments) paidBy[p.invoiceId] = round2((paidBy[p.invoiceId] || 0) + (p.amount || 0))
    const invLabel = Object.fromEntries(invoices.map((i) => [i.id, docNumberOf(i, padding)]))
    const estLabel = Object.fromEntries(estimates.map((e) => [e.id, docNumberOf(e, padding, 1)]))
    const propLabel = Object.fromEntries(proposals.map((p) => [p.id, fmtProposal(p)]))
    const docLabel = (type, rid) => (type === 'invoice' ? invLabel[rid] : type === 'estimate' ? estLabel[rid] : propLabel[rid]) || ''
    const docLink = (type, rid) => `/crm/${type === 'invoice' ? 'invoices' : type === 'estimate' ? 'estimates' : 'proposals'}/${rid}`

    // ---- engagement (document views with IP)
    const viewList = views.map((v) => ({ id: v.id, type: v.relType, docId: v.relId, label: docLabel(v.relType, v.relId), ip: v.viewIp, date: v.createdAt, link: docLink(v.relType, v.relId) }))
    const perDoc = {}
    for (const v of viewList) { const d = (perDoc[v.docId] ||= { type: v.type, docId: v.docId, label: v.label, link: v.link, views: 0, last: v.date, ips: new Set() }); d.views++; if (v.ip) d.ips.add(v.ip) }
    const engagement = {
        total: viewList.length, ips: [...new Set(viewList.map((v) => v.ip).filter(Boolean))].length, last: viewList[0]?.date || null,
        byDoc: Object.values(perDoc).map((d) => ({ ...d, ips: d.ips.size })).sort((a, b) => +new Date(b.last) - +new Date(a.last)).slice(0, 12),
        recent: viewList.slice(0, 15),
    }
    const lastLogin = contacts.filter((x) => x.lastLogin).sort((a, b) => +new Date(b.lastLogin) - +new Date(a.lastLogin))[0] || null

    // ---- what needs attention
    const today = new Date(new Date().toDateString())
    const unpaid = invoices.filter((i) => [1, 3, 4].includes(i.status)).map((i) => ({ ...i, due: round2(i.total - (paidBy[i.id] || 0)) })).filter((i) => i.due > 0)
    const overdue = unpaid.filter((i) => i.dueDate && new Date(i.dueDate) < today)
    const openTickets = tickets.filter((t) => !closed.some((x) => x.id === t.statusId))
    const openTasks = tasks.filter((t) => t.status !== 5)
    const attention = [
        ...overdue.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)).slice(0, 5).map((i) => ({ kind: 'overdue', tone: 'red', title: `Invoice ${invLabel[i.id]} is overdue`, detail: `Due ${i.dueDate.toISOString().slice(0, 10)} · ${i.due.toFixed(2)} left`, link: `/crm/invoices/${i.id}`, currencyId: i.currencyId })),
        ...unpaid.filter((i) => !overdue.includes(i)).slice(0, 3).map((i) => ({ kind: 'unpaid', tone: 'amber', title: `Invoice ${invLabel[i.id]} is waiting for payment`, detail: `${i.due.toFixed(2)} left${i.dueDate ? ` · due ${i.dueDate.toISOString().slice(0, 10)}` : ''}`, link: `/crm/invoices/${i.id}` })),
        ...proposals.filter((p) => [1, 4, 5].includes(p.status)).slice(0, 3).map((p) => ({ kind: 'proposal', tone: 'blue', title: `Proposal ${propLabel[p.id]} has no answer yet`, detail: p.subject || '', link: `/crm/proposals/${p.id}` })),
        ...estimates.filter((e) => e.status === 2).slice(0, 3).map((e) => ({ kind: 'estimate', tone: 'blue', title: `Estimate ${estLabel[e.id]} has no answer yet`, detail: '', link: `/crm/estimates/${e.id}` })),
        ...openTickets.slice(0, 3).map((t) => ({ kind: 'ticket', tone: 'purple', title: `Open ticket #${t.legacyId}`, detail: t.subject || '', link: `/crm/tickets/${t.id}` })),
        ...openTasks.slice(0, 4).map((t) => ({ kind: 'task', tone: t.dueDate && new Date(t.dueDate) < today ? 'red' : 'slate', title: t.name, detail: t.dueDate ? `Due ${t.dueDate.toISOString().slice(0, 10)}` : 'No due date', link: `/crm/tasks-board?task=${t.id}` })),
        ...contracts.filter((k) => k.dateEnd && new Date(k.dateEnd) > today && +new Date(k.dateEnd) - +today < 60 * 86400000).map((k) => ({ kind: 'contract', tone: 'amber', title: `Contract “${k.subject || ''}” ends soon`, detail: `Ends ${k.dateEnd.toISOString().slice(0, 10)}`, link: `/crm/contracts/${k.id}` })),
    ]

    // ---- lead journey
    const firstOf = (arr, key = 'createdAt') => arr.map((x) => x[key]).filter(Boolean).sort((a, b) => +new Date(a) - +new Date(b))[0] || null
    const proposalsAll = leadRow ? await prisma.crmProposal.findMany({ where: { relType: 'lead', relId: leadRow.id }, select: { createdAt: true, date: true } }) : []
    const sentProposal = firstOf([...proposalsAll, ...proposals])
    const firstPaid = payments.map((p) => p.paymentDate || p.createdAt).filter(Boolean).sort((a, b) => +new Date(a) - +new Date(b))[0] || null
    const converted = leadRow?.dateConverted || null
    const journey = [
        leadRow ? { key: 'lead', label: 'Lead created', date: leadRow.createdAt, done: true } : { key: 'lead', label: 'Added as a client', date: c.createdAt, done: true },
        { key: 'contacted', label: 'First contact', date: firstOf(leadNotes) || firstOf(leadActivity.filter((a) => /status/i.test(a.description))), done: !!(leadNotes.length || leadActivity.length > 1) },
        { key: 'proposal', label: 'Proposal sent', date: sentProposal, done: !!sentProposal },
        { key: 'converted', label: leadRow ? 'Converted to client' : 'Client', date: converted || c.createdAt, done: !!(converted || !leadRow) },
        { key: 'invoice', label: 'First invoice', date: firstOf(invoices.filter((i) => i.status !== 6), 'date'), done: invoices.some((i) => i.status !== 6) },
        { key: 'paid', label: 'First payment', date: firstPaid, done: !!firstPaid },
    ]
    const lead = leadRow ? {
        id: leadRow.id, name: leadRow.name, company: leadRow.company, email: leadRow.email, phone: leadRow.phoneNumber, status: leadStatus?.name || null, source: leadSource?.name || null,
        createdAt: leadRow.createdAt, dateConverted: leadRow.dateConverted, assigned: sName[leadRow.assigned] || null, addedBy: sName[leadRow.addedFrom] || null,
        daysToConvert: leadRow.dateConverted ? Math.max(0, Math.round((+new Date(leadRow.dateConverted) - +new Date(leadRow.createdAt)) / 86400000)) : null,
        notes: leadNotes.length, link: can('leads', 'view') ? `/crm/leads/${leadRow.id}` : null,
    } : null

    // ---- unified follow-up timeline
    const ev = []
    const add = (type, title, detail, date, link) => date && ev.push({ id: `${type}:${ev.length}`, type, title, detail: detail || '', date, link: link || null })
    if (leadRow) {
        add('lead', 'Lead created', `${leadRow.name}${leadSource?.name ? ` · source ${leadSource.name}` : ''}`, leadRow.createdAt, can('leads', 'view') ? `/crm/leads/${leadRow.id}` : null)
        for (const a of leadActivity) if (a.customActivity || /status|assign|proposal|convert/i.test(a.description)) add('lead', 'Lead: ' + strip(a.description).replace(/^not lead activity /i, '').replace(/_/g, ' '), strip(a.additionalData || ''), a.createdAt)
        for (const n of leadNotes) add('note', `Lead note${n.addedFrom && sName[n.addedFrom] ? ` · ${sName[n.addedFrom]}` : ''}`, strip(n.description), n.dateContacted || n.createdAt)
        if (leadRow.dateConverted) add('converted', 'Converted to client', leadRow.dateConverted && `${lead.daysToConvert} day${lead.daysToConvert === 1 ? '' : 's'} after the lead was created`, leadRow.dateConverted)
    } else add('client', 'Client created', '', c.createdAt)
    for (const i of invoices) {
        if (i.status !== 6) add('invoice', `Invoice ${invLabel[i.id]} created`, `${i.total.toFixed(2)}`, i.date || i.createdAt, `/crm/invoices/${i.id}`)
        if (i.dateSend) add('mail', `Invoice ${invLabel[i.id]} sent`, '', i.dateSend, `/crm/invoices/${i.id}`)
    }
    for (const p of payments) add('payment', `Payment received · ${invLabel[p.invoiceId] || ''}`, `${(p.amount || 0).toFixed(2)}`, p.paymentDate || p.createdAt, `/crm/invoices/${p.invoiceId}`)
    for (const e of estimates) { add('estimate', `Estimate ${estLabel[e.id]} created`, EST[e.status] || '', e.date || e.createdAt, `/crm/estimates/${e.id}`); if (e.status === 4 && e.acceptanceDate) add('accepted', `Estimate ${estLabel[e.id]} accepted`, '', e.acceptanceDate, `/crm/estimates/${e.id}`) }
    for (const p of proposals) { add('proposal', `Proposal ${propLabel[p.id]} created`, `${p.subject || ''} · ${PROP[p.status] || ''}`, p.date || p.createdAt, `/crm/proposals/${p.id}`); if (p.status === 3 && p.acceptanceDate) add('accepted', `Proposal ${propLabel[p.id]} accepted`, '', p.acceptanceDate, `/crm/proposals/${p.id}`) }
    for (const k of contracts) add('contract', `Contract “${k.subject || ''}”${k.signed ? ' signed' : ' created'}`, '', k.dateStart || k.createdAt, `/crm/contracts/${k.id}`)
    for (const pr of projects) add('project', `Project “${pr.name}” started`, '', pr.createdAt, `/crm/projects/${pr.id}`)
    for (const t of tickets) { add('ticket', `Ticket #${t.legacyId} opened`, t.subject || '', t.createdAt, `/crm/tickets/${t.id}`) }
    for (const t of tasks) { add('task', `Task: ${t.name}`, t.status === 5 ? 'completed' : t.dueDate ? `due ${t.dueDate.toISOString().slice(0, 10)}` : '', t.dateFinished || t.createdAt, `/crm/tasks-board?task=${t.id}`) }
    for (const n of notes) add('note', `Note${n.addedFrom && sName[n.addedFrom] ? ` · ${sName[n.addedFrom]}` : ''}`, strip(n.description), n.dateContacted || n.createdAt)
    for (const v of viewList.slice(0, 60)) add('view', `Client opened ${v.type} ${v.label}`, v.ip ? `from ${v.ip}` : '', v.date, v.link)
    for (const x of contacts) if (x.lastLogin) add('login', `${name(x)} signed in to the client area`, x.lastIp ? `from ${x.lastIp}` : '', x.lastLogin)
    const timeline = ev.sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 150)

    return {
        lead, journey, attention, engagement, timeline,
        lastLogin: lastLogin ? { name: name(lastLogin), ip: lastLogin.lastIp, date: lastLogin.lastLogin } : null,
        contacts: contacts.map((x) => ({ id: x.id, name: name(x), email: x.email, ip: x.lastIp, lastLogin: x.lastLogin, primary: x.isPrimary, active: x.active })),
        reminders: reminders.map((r) => ({ id: r.id, description: r.description || '', date: r.date, done: !!r.isNotified, staff: sName[r.staffId] || null })),
        stats: { openTasks: openTasks.length, openTickets: openTickets.length, overdueInvoices: overdue.length, unpaidInvoices: unpaid.length },
        can: { note: can('customers', 'edit'), reminder: can('customers', 'edit') },
    }
}

export async function addFollowUp(id, body) {
    const { session } = await load(id)
    await requirePermission('customers', 'edit')
    const staffId = await getStaffId(session)
    const text = String(body.description || '').trim().slice(0, 2000)
    if (!text) throw fail('Write something first')
    if (body.type === 'note') {
        await prisma.crmNote.create({ data: { relType: 'customer', relId: id, description: text, dateContacted: body.date ? new Date(body.date) : new Date(), addedFrom: staffId } })
    } else if (body.type === 'reminder') {
        const d = new Date(body.date)
        if (!body.date || Number.isNaN(+d)) throw fail('Pick the date of the reminder')
        await prisma.crmReminder.create({ data: { relType: 'customer', relId: id, description: text, date: d, staffId: oid(body.staffId) || staffId, creatorId: staffId, isNotified: false, notifyByEmail: !!body.notifyByEmail } })
    } else throw fail('Unknown follow-up type')
    return { success: true }
}

export async function deleteReminder(id, reminderId) {
    await load(id)
    await requirePermission('customers', 'edit')
    const r = oid(reminderId) && (await prisma.crmReminder.findFirst({ where: { id: reminderId, relType: 'customer', relId: id } }))
    if (!r) throw fail('Reminder not found', 404)
    await prisma.crmReminder.delete({ where: { id: reminderId } })
    return { success: true }
}
