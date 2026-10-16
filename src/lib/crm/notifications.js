import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, viewScope, hasCap } from '@/lib/crm/permissions'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'

const DAY = 86400000
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * What the signed-in staff member should know about, newest first. Nothing is stored: the feed is built from the
 * records themselves (client replies, assignments, due dates, payments, answers, new leads, documents opened),
 * limited to what the person may see. "Read" is tracked in the browser by the time the bell was last opened.
 */
export async function notificationFeed() {
    const session = await requirePermission(null)
    const authority = session.user.authority || []
    const can = (f) => viewScope(authority, f) !== null
    const all = (f) => viewScope(authority, f) === 'all'
    const staffId = await getStaffId(session)
    const now = new Date(), today = new Date(now.toDateString())
    const since = (days) => new Date(Date.now() - days * DAY)
    const items = []
    const add = (kind, title, detail, date, link, tone = 'blue') => date && items.push({ id: `${kind}:${items.length}:${+new Date(date)}`, kind, tone, title, detail: detail || '', date, link })

    if (can('tickets')) {
        const scope = all('tickets') ? {} : staffId ? { OR: [{ assignedId: staffId }, { adminId: staffId }] } : { id: '000000000000000000000000' }
        const rows = await prisma.crmTicket.findMany({ where: { AND: [scope, { adminRead: 0 }] }, orderBy: { createdAt: 'desc' }, take: 8 })
        for (const t of rows) add('ticket', t.lastReply ? `Client replied on ticket #${t.legacyId}` : `New ticket #${t.legacyId}`, t.subject, t.lastReply || t.createdAt, `/crm/tickets/${t.id}`, 'purple')
    }
    if (can('tasks') && staffId) {
        const mine = await prisma.crmTaskAssigned.findMany({ where: { staffId }, select: { taskId: true, createdAt: true } })
        const ids = mine.map((m) => m.taskId)
        if (ids.length) {
            const tasks = await prisma.crmTask.findMany({ where: { id: { in: ids }, status: { not: 5 } }, select: { id: true, name: true, dueDate: true } })
            const when = Object.fromEntries(mine.map((m) => [m.taskId, m.createdAt]))
            for (const t of tasks) {
                if (when[t.id] >= since(7)) add('task', 'A task was assigned to you', t.name, when[t.id], `/crm/tasks-board?task=${t.id}`, 'blue')
                if (t.dueDate && new Date(t.dueDate) <= new Date(+today + DAY)) add('task', new Date(t.dueDate) < today ? 'Task overdue' : 'Task due today', t.name, new Date(t.dueDate) < today ? today : t.dueDate, `/crm/tasks-board?task=${t.id}`, 'red')
            }
        }
    }
    if (staffId) {
        const rem = await prisma.crmReminder.findMany({ where: { staffId, date: { gte: since(7), lte: new Date(Date.now() + DAY) } }, orderBy: { date: 'desc' }, take: 6 })
        for (const r of rem) add('reminder', 'Reminder', r.description, r.date, r.relType === 'customer' ? `/crm/clients/${r.relId}` : r.relType === 'lead' ? `/crm/leads/${r.relId}` : null, 'amber')
    }
    const padding = await numberPadding()
    if (all('payments') || all('invoices')) { // company-wide figures: only for people who see all of them
        const inv = await prisma.crmInvoice.findMany({ where: { status: 4 }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true } })
        if (inv.length) add('invoice', `${inv.length} invoice${inv.length === 1 ? ' is' : 's are'} overdue`, inv.slice(0, 3).map((i) => docNumberOf(i, padding)).join(', ') + (inv.length > 3 ? '…' : ''), today, '/crm/invoices', 'red')
        const pays = await prisma.crmPayment.findMany({ where: { OR: [{ paymentDate: { gte: since(7) } }, { createdAt: { gte: since(7) } }] }, orderBy: { createdAt: 'desc' }, take: 6 })
        if (pays.length) {
            const invs = await prisma.crmInvoice.findMany({ where: { id: { in: pays.map((p) => p.invoiceId) } }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true, clientId: true } })
            const cl = await prisma.crmClient.findMany({ where: { id: { in: invs.map((i) => i.clientId).filter(Boolean) } }, select: { id: true, company: true } })
            const iMap = Object.fromEntries(invs.map((i) => [i.id, i])), cMap = Object.fromEntries(cl.map((c) => [c.id, c.company]))
            for (const p of pays) { const i = iMap[p.invoiceId]; if (i) add('payment', `Payment received · ${(p.amount || 0).toFixed(2)}`, `${docNumberOf(i, padding)} · ${cMap[i.clientId] || ''}`, p.paymentDate || p.createdAt, `/crm/invoices/${i.id}`, 'green') }
        }
    }
    if (can('estimates')) {
        const es = await prisma.crmEstimate.findMany({ where: { acceptanceDate: { gte: since(14) }, status: { in: [3, 4] } }, take: 6 })
        for (const e of es) add('estimate', `Estimate ${docNumberOf(e, padding, 1)} was ${e.status === 4 ? 'accepted' : 'declined'}`, '', e.acceptanceDate, `/crm/estimates/${e.id}`, e.status === 4 ? 'green' : 'red')
    }
    if (can('proposals')) {
        const ps = await prisma.crmProposal.findMany({ where: { acceptanceDate: { gte: since(14) }, status: { in: [2, 3] } }, take: 6 })
        for (const p of ps) add('proposal', `Proposal “${p.subject || ''}” was ${p.status === 3 ? 'accepted' : 'declined'}`, '', p.acceptanceDate, `/crm/proposals/${p.id}`, p.status === 3 ? 'green' : 'red')
    }
    if (can('leads')) {
        const scope = all('leads') ? {} : staffId ? { assigned: staffId } : { id: '000000000000000000000000' }
        const ls = await prisma.crmLead.findMany({ where: { AND: [scope, { createdAt: { gte: since(3) }, lost: false, junk: false }] }, orderBy: { createdAt: 'desc' }, take: 6 })
        for (const l of ls) add('lead', 'New lead', [l.name, l.company].filter(Boolean).join(' · '), l.createdAt, `/crm/leads/${l.id}`, 'blue')
    }
    if (can('invoices') || can('estimates') || can('proposals')) {
        const vs = await prisma.crmViewTracking.findMany({ where: { relType: { in: ['invoice', 'estimate', 'proposal'] }, createdAt: { gte: since(3) } }, orderBy: { createdAt: 'desc' }, take: 6 })
        for (const v of vs) add('view', `Client opened ${v.relType === 'invoice' ? 'an invoice' : v.relType === 'estimate' ? 'an estimate' : 'a proposal'}`, v.viewIp ? `from ${v.viewIp}` : '', v.createdAt, `/crm/${v.relType === 'invoice' ? 'invoices' : v.relType === 'estimate' ? 'estimates' : 'proposals'}/${v.relId}`, 'gray')
    }
    void hasCap; void strip
    return { items: items.sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 40), serverTime: now.toISOString() }
}
