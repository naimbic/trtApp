import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { viewScope, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { toBase, ALL } from '@/lib/crm/rates'
import { loadRates } from '@/lib/crm/ratesDb'

const iso = (d) => d.toISOString().slice(0, 10)
const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const utcDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
const addDaysTo = (d, n) => new Date(d.getTime() + n * 86400000)
const PRESET_LABEL = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', month: 'This month', lastmonth: 'Last month', year: 'This year', '12m': 'Last 12 months', custom: 'Custom' }

/** Resolve ?range=today|7d|30d|month|lastmonth|year|12m|custom&from&to into a UTC window and its chart buckets. */
export function resolveRange({ range = '12m', from, to } = {}) {
    const today = utcDay(new Date())
    let key = PRESET_LABEL[range] ? range : '12m'
    let f, t
    if (key === 'today') [f, t] = [today, today]
    else if (key === '7d') [f, t] = [addDaysTo(today, -6), today]
    else if (key === '30d') [f, t] = [addDaysTo(today, -29), today]
    else if (key === 'month') [f, t] = [new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), today]
    else if (key === 'lastmonth') {
        f = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
        t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))
    } else if (key === 'year') [f, t] = [new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), today]
    else if (key === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(from || '') && /^\d{4}-\d{2}-\d{2}$/.test(to || '') && from <= to) [f, t] = [new Date(`${from}T00:00:00Z`), new Date(`${to}T00:00:00Z`)]
    else {
        key = '12m'
        f = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1))
        t = today
    }
    const days = Math.round((t - f) / 86400000) + 1
    const granularity = days <= 62 ? 'day' : 'month'
    const keys = []
    if (granularity === 'day') for (let i = 0; i < days; i++) keys.push(iso(addDaysTo(f, i)))
    else {
        for (let d = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 1)); d <= t && keys.length < 60; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) keys.push(monthKey(d))
    }
    return { key, label: key === 'custom' ? `${iso(f)} → ${iso(t)}` : PRESET_LABEL[key], from: f, until: addDaysTo(t, 1), fromIso: iso(f), toIso: iso(t), granularity, keys }
}
const count = (rows, fn) => rows.reduce((m, r) => {
    const k = fn(r)
    m[k] = (m[k] || 0) + 1
    return m
}, {})

const TASK_STATUS = { 1: 'Not started', 2: 'Awaiting feedback', 3: 'Testing', 4: 'In progress', 5: 'Complete' }
const PROJECT_STATUS = { 1: 'Not started', 2: 'In progress', 3: 'On hold', 4: 'Finished', 5: 'Cancelled' }
const ESTIMATE_STATUS = { 1: 'Draft', 2: 'Sent', 3: 'Declined', 4: 'Accepted', 5: 'Expired' }
const INVOICE_STATUS = { 1: 'Unpaid', 2: 'Paid', 3: 'Partially paid', 4: 'Overdue', 5: 'Cancelled', 6: 'Draft' }

/** Aggregated CRM metrics. Each section is built only if the user may view all records of that feature. */
export async function getDashboardMetrics(params = {}) {
    const session = await auth()
    if (!session?.user?.id) return null
    const authority = session.user.authority || []
    // the business dashboard is for administrators (and whoever was given it or manages roles)
    if (!(isCrmAdmin(authority) || hasCap(authority, 'dashboard', 'view') || hasCap(authority, 'roles', 'view'))) throw Object.assign(new Error('Forbidden'), { status: 403 })
    const money = isCrmAdmin(authority) || hasCap(authority, 'finance', 'view_amounts')
    // money sections are only built for people who may see financial figures
    const MONEY_SECTIONS = ['invoices', 'expenses', 'estimates', 'recent']
    const can = (feature) => viewScope(authority, feature) === 'all'
    const R = resolveRange(params)
    const months = R.keys // chart buckets: YYYY-MM-DD (short ranges) or YYYY-MM
    const bk = (d) => (R.granularity === 'day' ? iso(new Date(d)) : monthKey(new Date(d)))
    const since = R.from
    const until = R.until
    const inRange = (d) => d && new Date(d) >= since && new Date(d) < until
    const today = new Date()
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const padding = await numberPadding()
    const data = { generatedAt: new Date().toISOString(), months, granularity: R.granularity, range: { key: R.key, label: R.label, from: R.fromIso, to: R.toIso }, sections: [], moneyHidden: !money }

    const section = async (name, feature, fn) => {
        if (feature && !can(feature)) return
        if (MONEY_SECTIONS.includes(name) && !money) return
        try {
            data[name] = await fn()
            data.sections.push(name)
        } catch (e) {
            data[name] = { error: String(e.message || e).slice(0, 160) }
        }
    }

    const currencies = await prisma.crmCurrency.findMany({ orderBy: { name: 'asc' } })
    const rt = await loadRates() // for the ALL view: every currency converted into the base one
    data.ratesMissing = rt.missing
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
                outstandingAtStart: 0, // the same snapshots as the day the period began, for the comparison
                overdueAtStart: 0,
                byStatus: {},
                invoicedByMonth: Object.fromEntries(months.map((m) => [m, 0])),
                collectedByMonth: Object.fromEntries(months.map((m) => [m, 0])),
            })
        const clientTotals = {}
        const paidBefore = {} // payments received before the period began
        for (const p of payments) if (p.invoiceId && p.paymentDate && new Date(p.paymentDate) < since) paidBefore[p.invoiceId] = round2((paidBefore[p.invoiceId] || 0) + (p.amount || 0))
        // every figure goes to its own currency and, converted with its rate, to ALL
        const targets = (cid) => { const k = toBase(1, cid, rt); return k === null ? [[bucket(cid), 1]] : cid === ALL ? [[bucket(cid), 1]] : [[bucket(cid), 1], [bucket(ALL), k]] }
        for (const i of invoices) {
            if (i.status === 5 || i.status === 6) continue // cancelled / draft don't count as revenue
            const paid = paidByInvoice[i.id] || 0
            const due = round2(i.total - paid)
            const overdue = due > 0 && i.dueDate && new Date(i.dueDate) < startOfToday
            const dueThen = i.date && new Date(i.date) < since ? round2(i.total - (paidBefore[i.id] || 0)) : 0
            for (const [b, k] of targets(i.currencyId)) {
                if (dueThen > 0) {
                    b.outstandingAtStart = round2(b.outstandingAtStart + dueThen * k)
                    if (i.dueDate && new Date(i.dueDate) < since) b.overdueAtStart = round2(b.overdueAtStart + dueThen * k)
                }
                // snapshots (as of today, independent of the date filter)
                b.outstanding = round2(b.outstanding + Math.max(due, 0) * k)
                if (overdue) {
                    b.overdue = round2(b.overdue + due * k)
                    b.overdueCount += 1
                }
                // period figures: invoices dated inside the selected range
                if (!inRange(i.date)) continue
                b.invoiced = round2(b.invoiced + i.total * k)
                const st = INVOICE_STATUS[i.status] || String(i.status)
                b.byStatus[st] = (b.byStatus[st] || 0) + 1
                const mk = bk(i.date)
                if (mk in b.invoicedByMonth) b.invoicedByMonth[mk] = round2(b.invoicedByMonth[mk] + i.total * k)
            }
            if (inRange(i.date) && i.clientId) {
                const kk = `${i.clientId}|${i.currencyId || 'none'}`
                clientTotals[kk] = round2((clientTotals[kk] || 0) + i.total)
            }
        }
        // collected = payments dated inside the selected range
        for (const p of payments) {
            const inv = invById[p.invoiceId]
            if (!inv || !inRange(p.paymentDate)) continue
            for (const [b, k] of targets(inv.currencyId)) {
                b.paid = round2(b.paid + (p.amount || 0) * k)
                const mk = bk(p.paymentDate)
                if (mk in b.collectedByMonth) b.collectedByMonth[mk] = round2(b.collectedByMonth[mk] + (p.amount || 0) * k)
            }
        }

        const clientIds = [...new Set(Object.keys(clientTotals).map((k) => k.split('|')[0]))]
        const clients = await prisma.crmClient.findMany({ where: { id: { in: clientIds } }, select: { id: true, company: true } })
        const clientName = Object.fromEntries(clients.map((c) => [c.id, c.company]))
        // the best clients of each currency, and of ALL (every client's invoices converted into the base currency)
        const perCurrency = {}
        const allByClient = {}
        for (const [k, total] of Object.entries(clientTotals)) {
            const [clientId, currencyId] = k.split('|')
            ;(perCurrency[currencyId] ||= []).push({ clientId, currencyId, company: clientName[clientId] || '—', total })
            const f = toBase(1, currencyId === 'none' ? null : currencyId, rt)
            if (f !== null) allByClient[clientId] = round2((allByClient[clientId] || 0) + total * f)
        }
        perCurrency[ALL] = Object.entries(allByClient).map(([clientId, total]) => ({ clientId, currencyId: ALL, company: clientName[clientId] || '—', total }))
        const topClients = Object.values(perCurrency).flatMap((list) => list.sort((a, b) => b.total - a.total).slice(0, 8))

        const overdueList = invoices
            .filter((i) => i.status !== 5 && i.status !== 6 && i.dueDate && new Date(i.dueDate) < startOfToday && round2(i.total - (paidByInvoice[i.id] || 0)) > 0)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 8)
            .map((i) => ({ id: i.id, number: docNumberOf(i, padding), company: clientName[i.clientId] || '', dueDate: i.dueDate, due: round2(i.total - (paidByInvoice[i.id] || 0)), currencyId: i.currencyId }))

        return { byCurrency, topClients, overdueList }
    })

    await section('expenses', 'expenses', async () => {
        const rows = await prisma.crmExpense.findMany({ where: { date: { gte: since, lt: until } }, select: { amount: true, currencyId: true, date: true } })
        const byCurrency = {}
        for (const e of rows) {
            const k = toBase(1, e.currencyId, rt)
            const mk = bk(e.date)
            for (const [cid, f] of [[e.currencyId || 'none', 1], ...(k === null ? [] : [[ALL, k]])]) {
                const b = (byCurrency[cid] ||= Object.fromEntries(months.map((m) => [m, 0])))
                if (mk in b) b[mk] = round2(b[mk] + (e.amount || 0) * f)
            }
        }
        return { byCurrency }
    })

    await section('clients', 'customers', async () => {
        const [total, active, newByMonthRows, totalAtStart] = await Promise.all([
            prisma.crmClient.count(),
            prisma.crmClient.count({ where: { active: true } }),
            prisma.crmClient.findMany({ where: { createdAt: { gte: since, lt: until } }, select: { createdAt: true } }),
            prisma.crmClient.count({ where: { createdAt: { lt: since } } }),
        ])
        const byMonth = Object.fromEntries(months.map((m) => [m, 0]))
        for (const c of newByMonthRows) {
            const mk = bk(c.createdAt)
            if (mk in byMonth) byMonth[mk] += 1
        }
        return { total, active, byMonth, totalAtStart }
    })

    await section('leads', 'leads', async () => {
        const [leads, statuses] = await Promise.all([
            prisma.crmLead.findMany({ where: { createdAt: { gte: since, lt: until } }, select: { statusId: true, lost: true, junk: true, clientId: true, createdAt: true } }),
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
        const rows = await prisma.crmProject.findMany({ where: { createdAt: { gte: since, lt: until } }, select: { status: true } })
        return { total: rows.length, byStatus: count(rows, (p) => PROJECT_STATUS[p.status] || String(p.status)) }
    })

    await section('tasks', 'tasks', async () => {
        const rows = await prisma.crmTask.findMany({ where: { createdAt: { gte: since, lt: until } }, select: { id: true, name: true, status: true, dueDate: true, priority: true } })
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
            prisma.crmTicket.findMany({ where: { createdAt: { gte: since, lt: until } }, select: { statusId: true } }),
            prisma.crmTicketStatus.findMany({ orderBy: { statusOrder: 'asc' } }),
        ])
        const name = Object.fromEntries(statuses.map((s) => [s.id, s.name]))
        const byStatus = count(rows, (t) => name[t.statusId] || 'No status')
        const closed = statuses.filter((s) => /closed|resolved/i.test(s.name)).map((s) => s.id)
        return { total: rows.length, open: rows.filter((t) => !closed.includes(t.statusId)).length, byStatus }
    })

    await section('estimates', 'estimates', async () => {
        const rows = await prisma.crmEstimate.findMany({ where: { createdAt: { gte: since, lt: until } }, select: { status: true } })
        return { total: rows.length, byStatus: count(rows, (e) => ESTIMATE_STATUS[e.status] || String(e.status)) }
    })

    await section('recent', 'payments', async () => {
        const [payments, activity] = await Promise.all([
            prisma.crmPayment.findMany({ where: { paymentDate: { gte: since, lt: until } }, orderBy: { paymentDate: 'desc' }, take: 8, include: { invoice: { select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true, currencyId: true } } } }),
            prisma.crmSalesActivity.findMany({ orderBy: { date: 'desc' }, take: 8 }),
        ])
        return {
            payments: payments.map((p) => ({
                id: p.id,
                amount: p.amount,
                date: p.paymentDate,
                invoiceId: p.invoiceId,
                invoiceNumber: p.invoice ? docNumberOf(p.invoice, padding) : '',
                currencyId: p.invoice?.currencyId || null,
            })),
            activity: activity.map((a) => ({ id: a.id, description: a.description, date: a.date || a.createdAt, relType: a.relType, relId: a.relId })),
        }
    })

    // the same figures for the period just before, so the charts can draw it as a comparison line
    if (!params.noPrev) {
        try {
            const len = R.until - R.from
            const pf = new Date(+R.from - len), pt = new Date(+R.from - 86400000)
            const p = await getDashboardMetrics({ range: 'custom', from: iso(pf), to: iso(pt), noPrev: true })
            if (p) data.prev = { months: p.months, label: `${iso(pf)} → ${iso(pt)}`, invoices: p.invoices, expenses: p.expenses, clients: p.clients, leads: p.leads, projects: p.projects, tasks: p.tasks, tickets: p.tickets, estimates: p.estimates }
        } catch { /* comparison is optional */ }
    }
    return data
}
