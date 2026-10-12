import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { viewScope } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'

const MONTHS = 12
const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const lastMonths = (n) => {
    const out = []
    const now = new Date()
    for (let i = n - 1; i >= 0; i--) out.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))))
    return out
}
const count = (rows, fn) => rows.reduce((m, r) => {
    const k = fn(r)
    m[k] = (m[k] || 0) + 1
    return m
}, {})

const TASK_STATUS = { 1: 'Not started', 2: 'Awaiting feedback', 3: 'Testing', 4: 'In progress', 5: 'Complete' }
const PROJECT_STATUS = { 1: 'Not started', 2: 'In progress', 3: 'On hold', 4: 'Cancelled', 5: 'Finished' }
const ESTIMATE_STATUS = { 1: 'Draft', 2: 'Sent', 3: 'Declined', 4: 'Accepted', 5: 'Expired' }
const INVOICE_STATUS = { 1: 'Unpaid', 2: 'Paid', 3: 'Partially paid', 4: 'Overdue', 5: 'Cancelled', 6: 'Draft' }

/** Aggregated CRM metrics. Each section is built only if the user may view all records of that feature. */
export async function getDashboardMetrics() {
    const session = await auth()
    if (!session?.user?.id) return null
    const authority = session.user.authority || []
    const can = (feature) => viewScope(authority, feature) === 'all'
    const months = lastMonths(MONTHS)
    const since = new Date(Date.UTC(Number(months[0].slice(0, 4)), Number(months[0].slice(5)) - 1, 1))
    const today = new Date()
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const data = { generatedAt: new Date().toISOString(), months, sections: [] }

    const section = async (name, feature, fn) => {
        if (feature && !can(feature)) return
        try {
            data[name] = await fn()
            data.sections.push(name)
        } catch (e) {
            data[name] = { error: String(e.message || e).slice(0, 160) }
        }
    }

    const currencies = await prisma.crmCurrency.findMany({ orderBy: { name: 'asc' } })
    data.currencies = currencies.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, isDefault: c.isDefault, placement: c.placement }))

    await section('invoices', 'invoices', async () => {
        const invoices = await prisma.crmInvoice.findMany({
            select: { id: true, clientId: true, number: true, prefix: true, currencyId: true, total: true, status: true, date: true, dueDate: true },
        })
        const payments = await prisma.crmPayment.findMany({ select: { invoiceId: true, amount: true, paymentDate: true } })
        const invById = Object.fromEntries(invoices.map((i) => [i.id, i]))
        const paidByInvoice = {}
        for (const p of payments) paidByInvoice[p.invoiceId] = round2((paidByInvoice[p.invoiceId] || 0) + (p.amount || 0))

        const byCurrency = {}
        const bucket = (cid) =>
            (byCurrency[cid || 'none'] ||= {
                invoiced: 0,
                paid: 0,
                outstanding: 0,
                overdue: 0,
                overdueCount: 0,
                byStatus: {},
                invoicedByMonth: Object.fromEntries(months.map((m) => [m, 0])),
                collectedByMonth: Object.fromEntries(months.map((m) => [m, 0])),
            })
        const clientTotals = {}
        for (const i of invoices) {
            if (i.status === 5 || i.status === 6) continue // cancelled / draft don't count as revenue
            const b = bucket(i.currencyId)
            const paid = paidByInvoice[i.id] || 0
            const due = round2(i.total - paid)
            b.invoiced = round2(b.invoiced + i.total)
            b.paid = round2(b.paid + paid)
            b.outstanding = round2(b.outstanding + Math.max(due, 0))
            const overdue = due > 0 && i.dueDate && new Date(i.dueDate) < startOfToday
            if (overdue) {
                b.overdue = round2(b.overdue + due)
                b.overdueCount += 1
            }
            const st = INVOICE_STATUS[i.status] || String(i.status)
            b.byStatus[st] = (b.byStatus[st] || 0) + 1
            if (i.date) {
                const mk = monthKey(new Date(i.date))
                if (mk in b.invoicedByMonth) b.invoicedByMonth[mk] = round2(b.invoicedByMonth[mk] + i.total)
            }
            if (i.clientId) {
                const k = `${i.clientId}|${i.currencyId || 'none'}`
                clientTotals[k] = round2((clientTotals[k] || 0) + i.total)
            }
        }
        for (const p of payments) {
            const inv = invById[p.invoiceId]
            if (!inv || !p.paymentDate) continue
            const b = bucket(inv.currencyId)
            const mk = monthKey(new Date(p.paymentDate))
            if (mk in b.collectedByMonth) b.collectedByMonth[mk] = round2(b.collectedByMonth[mk] + (p.amount || 0))
        }

        const clientIds = [...new Set(Object.keys(clientTotals).map((k) => k.split('|')[0]))]
        const clients = await prisma.crmClient.findMany({ where: { id: { in: clientIds } }, select: { id: true, company: true } })
        const clientName = Object.fromEntries(clients.map((c) => [c.id, c.company]))
        const topClients = Object.entries(clientTotals)
            .map(([k, total]) => {
                const [clientId, currencyId] = k.split('|')
                return { clientId, currencyId, company: clientName[clientId] || '—', total }
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, 8)

        const overdueList = invoices
            .filter((i) => i.status !== 5 && i.status !== 6 && i.dueDate && new Date(i.dueDate) < startOfToday && round2(i.total - (paidByInvoice[i.id] || 0)) > 0)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 8)
            .map((i) => ({ id: i.id, number: `${i.prefix || ''}${String(i.number).padStart(6, '0')}`, company: clientName[i.clientId] || '', dueDate: i.dueDate, due: round2(i.total - (paidByInvoice[i.id] || 0)), currencyId: i.currencyId }))

        return { byCurrency, topClients, overdueList }
    })

    await section('expenses', 'expenses', async () => {
        const rows = await prisma.crmExpense.findMany({ where: { date: { gte: since } }, select: { amount: true, currencyId: true, date: true } })
        const byCurrency = {}
        for (const e of rows) {
            const b = (byCurrency[e.currencyId || 'none'] ||= Object.fromEntries(months.map((m) => [m, 0])))
            const mk = monthKey(new Date(e.date))
            if (mk in b) b[mk] = round2(b[mk] + (e.amount || 0))
        }
        return { byCurrency }
    })

    await section('clients', 'customers', async () => {
        const [total, active, newByMonthRows] = await Promise.all([
            prisma.crmClient.count(),
            prisma.crmClient.count({ where: { active: true } }),
            prisma.crmClient.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        ])
        const byMonth = Object.fromEntries(months.map((m) => [m, 0]))
        for (const c of newByMonthRows) {
            const mk = monthKey(new Date(c.createdAt))
            if (mk in byMonth) byMonth[mk] += 1
        }
        return { total, active, byMonth }
    })

    await section('leads', 'leads', async () => {
        const [leads, statuses] = await Promise.all([
            prisma.crmLead.findMany({ select: { statusId: true, lost: true, junk: true, clientId: true, createdAt: true } }),
            prisma.crmLeadStatus.findMany({ orderBy: { statusOrder: 'asc' } }),
        ])
        const name = Object.fromEntries(statuses.map((s) => [s.id, s.name]))
        const open = leads.filter((l) => !l.lost && !l.junk && !l.clientId)
        const byStatus = count(open, (l) => name[l.statusId] || 'No status')
        return {
            total: leads.length,
            open: open.length,
            converted: leads.filter((l) => l.clientId).length,
            lost: leads.filter((l) => l.lost).length,
            junk: leads.filter((l) => l.junk).length,
            byStatus,
        }
    })

    await section('projects', 'projects', async () => {
        const rows = await prisma.crmProject.findMany({ select: { status: true } })
        return { total: rows.length, byStatus: count(rows, (p) => PROJECT_STATUS[p.status] || String(p.status)) }
    })

    await section('tasks', 'tasks', async () => {
        const rows = await prisma.crmTask.findMany({ select: { id: true, name: true, status: true, dueDate: true, priority: true } })
        const open = rows.filter((t) => t.status !== 5)
        const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < startOfToday)
        const week = new Date(startOfToday.getTime() + 7 * 86400000)
        const upcoming = open
            .filter((t) => t.dueDate && new Date(t.dueDate) >= startOfToday && new Date(t.dueDate) <= week)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 8)
            .map((t) => ({ id: t.id, name: t.name, dueDate: t.dueDate, status: TASK_STATUS[t.status] }))
        return {
            total: rows.length,
            open: open.length,
            overdue: overdue.length,
            byStatus: count(rows, (t) => TASK_STATUS[t.status] || String(t.status)),
            upcoming,
        }
    })

    await section('tickets', 'tickets', async () => {
        const [rows, statuses] = await Promise.all([
            prisma.crmTicket.findMany({ select: { statusId: true } }),
            prisma.crmTicketStatus.findMany({ orderBy: { statusOrder: 'asc' } }),
        ])
        const name = Object.fromEntries(statuses.map((s) => [s.id, s.name]))
        const byStatus = count(rows, (t) => name[t.statusId] || 'No status')
        const closed = statuses.filter((s) => /closed|resolved/i.test(s.name)).map((s) => s.id)
        return { total: rows.length, open: rows.filter((t) => !closed.includes(t.statusId)).length, byStatus }
    })

    await section('estimates', 'estimates', async () => {
        const rows = await prisma.crmEstimate.findMany({ select: { status: true } })
        return { total: rows.length, byStatus: count(rows, (e) => ESTIMATE_STATUS[e.status] || String(e.status)) }
    })

    await section('recent', 'payments', async () => {
        const [payments, activity] = await Promise.all([
            prisma.crmPayment.findMany({ orderBy: { paymentDate: 'desc' }, take: 8, include: { invoice: { select: { id: true, number: true, prefix: true, currencyId: true } } } }),
            prisma.crmSalesActivity.findMany({ orderBy: { date: 'desc' }, take: 8 }),
        ])
        return {
            payments: payments.map((p) => ({
                id: p.id,
                amount: p.amount,
                date: p.paymentDate,
                invoiceId: p.invoiceId,
                invoiceNumber: p.invoice ? `${p.invoice.prefix || ''}${String(p.invoice.number).padStart(6, '0')}` : '',
                currencyId: p.invoice?.currencyId || null,
            })),
            activity: activity.map((a) => ({ id: a.id, description: a.description, date: a.date || a.createdAt, relType: a.relType, relId: a.relId })),
        }
    })

    return data
}
