import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { viewScope } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'

/**
 * CRM dashboard metrics with date range + previous-period comparison.
 * Shape follows the Ratokil dashboard contracts (KPI cards with sparkline/trend, time series, heat tables,
 * day×hour heatmap, zone drill-down) adapted to CRM data. Every block is gated by the user's permissions.
 */

const DEFAULT_TZ = 'Africa/Casablanca'
const MAX_DAYS = 366
const BLOCKS = [[0, 6], [6, 9], [9, 12], [12, 14], [14, 18], [18, 24]]
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const fmtCache = new Map()
const fmt = (tz, key, opts) => {
    const k = `${tz}|${key}`
    if (!fmtCache.has(k)) fmtCache.set(k, new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }))
    return fmtCache.get(k)
}
/** YYYY-MM-DD of an instant in the business timezone. */
const dayStr = (date, tz) => {
    const p = Object.fromEntries(fmt(tz, 'd', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date)).map((x) => [x.type, x.value]))
    return `${p.year}-${p.month}-${p.day}`
}
const addDays = (s, n) => {
    const d = new Date(`${s}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
}
const diffDays = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000)
const listDays = (from, to) => Array.from({ length: diffDays(from, to) + 1 }, (_, i) => addDays(from, i))
const weekdayHour = (date, tz) => {
    const p = Object.fromEntries(fmt(tz, 'wh', { weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(date)).map((x) => [x.type, x.value]))
    const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday)
    return { wd, hour: Number(p.hour) % 24 }
}
const blockOf = (h) => BLOCKS.findIndex(([a, b]) => h >= a && h < b)

const PRESETS = {
    today: 'Today', yesterday: 'Yesterday', '3d': 'Last 3 days', '7d': 'Last 7 days', '30d': 'Last 30 days',
    month: 'This month', lastmonth: 'Last month', custom: 'Custom',
}

export function resolveRange({ range = '30d', from, to } = {}, tz = DEFAULT_TZ) {
    const today = dayStr(new Date(), tz)
    let key = PRESETS[range] ? range : '30d'
    let f, t
    if (key === 'today') [f, t] = [today, today]
    else if (key === 'yesterday') [f, t] = [addDays(today, -1), addDays(today, -1)]
    else if (key === '3d') [f, t] = [addDays(today, -2), today]
    else if (key === '7d') [f, t] = [addDays(today, -6), today]
    else if (key === 'month') [f, t] = [`${today.slice(0, 8)}01`, today]
    else if (key === 'lastmonth') {
        const first = `${today.slice(0, 8)}01`
        t = addDays(first, -1)
        f = `${t.slice(0, 8)}01`
    } else if (key === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(from || '') && /^\d{4}-\d{2}-\d{2}$/.test(to || '') && from <= to) [f, t] = [from, to]
    else {
        key = '30d'
        ;[f, t] = [addDays(today, -29), today]
    }
    if (diffDays(f, t) + 1 > MAX_DAYS) f = addDays(t, -(MAX_DAYS - 1))
    const days = listDays(f, t)
    const prevTo = addDays(f, -1)
    const prevFrom = addDays(prevTo, -(days.length - 1))
    return { key, label: key === 'custom' ? `${f} → ${t}` : PRESETS[key], from: f, to: t, prevFrom, prevTo, days, prevDays: listDays(prevFrom, prevTo), today, tz }
}

const delta = (cur, prev) => {
    if (!prev) return cur ? { pct: 100, dir: 'up' } : { pct: 0, dir: 'flat' }
    const pct = ((cur - prev) / prev) * 100
    return { pct, dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' }
}
const sum = (a) => a.reduce((s, n) => s + n, 0)

export async function getDashboardMetrics(params = {}) {
    const session = await auth()
    if (!session?.user?.id) return null
    const authority = session.user.authority || []
    const can = (feature) => viewScope(authority, feature) === 'all'

    const tzOpt = await prisma.crmOption.findUnique({ where: { name: 'dashboard_timezone' } })
    const tz = tzOpt?.value || DEFAULT_TZ
    const R = resolveRange(params, tz)
    const inCur = (d) => d >= R.from && d <= R.to
    const inPrev = (d) => d >= R.prevFrom && d <= R.prevTo
    const inAny = (d) => d >= R.prevFrom && d <= R.to
    const windowStart = new Date(`${addDays(R.prevFrom, -1)}T00:00:00Z`)
    const windowEnd = new Date(`${addDays(R.to, 2)}T00:00:00Z`)
    const weekly = R.days.length > 45

    const wantInvoices = can('invoices')
    const wantCustomers = can('customers')
    const wantLeads = can('leads')
    const wantTickets = can('tickets')
    const wantTasks = can('tasks')
    const wantExpenses = can('expenses')

    const [currencies, invoices, payments, expenses, clients, leads, sources, leadStatuses, tickets, tasks] = await Promise.all([
        prisma.crmCurrency.findMany({ orderBy: { name: 'asc' } }),
        wantInvoices ? prisma.crmInvoice.findMany({ select: { id: true, clientId: true, currencyId: true, total: true, status: true, date: true, dueDate: true, number: true, prefix: true } }) : [],
        can('payments') || wantInvoices ? prisma.crmPayment.findMany({ select: { id: true, invoiceId: true, amount: true, paymentDate: true } }) : [],
        wantExpenses ? prisma.crmExpense.findMany({ where: { date: { gte: windowStart, lt: windowEnd } }, select: { amount: true, currencyId: true, date: true } }) : [],
        wantCustomers || wantInvoices ? prisma.crmClient.findMany({ select: { id: true, company: true, city: true, createdAt: true, active: true } }) : [],
        wantLeads ? prisma.crmLead.findMany({ select: { createdAt: true, statusId: true, sourceId: true, lost: true, junk: true, clientId: true } }) : [],
        wantLeads ? prisma.crmLeadSource.findMany({ orderBy: { name: 'asc' } }) : [],
        wantLeads ? prisma.crmLeadStatus.findMany() : [],
        wantTickets ? prisma.crmTicket.findMany({ select: { createdAt: true } }) : [],
        wantTasks ? prisma.crmTask.findMany({ select: { id: true, name: true, status: true, dueDate: true } }) : [],
    ])

    // ----- currency selection (amounts are never mixed across currencies)
    const defaultCur = currencies.find((c) => c.isDefault) || currencies[0]
    const curOf = (id) => id || defaultCur?.id || null
    const used = [...new Set(invoices.map((i) => curOf(i.currencyId)))].filter(Boolean)
    const currencyId = used.includes(params.currency) ? params.currency : used.includes(defaultCur?.id) ? defaultCur.id : used[0] || defaultCur?.id || null
    const currencyList = currencies.filter((c) => !used.length || used.includes(c.id)).map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, placement: c.placement }))

    // ----- invoices / payments in the selected currency
    const revenueInvoices = invoices.filter((i) => i.status !== 5 && i.status !== 6 && curOf(i.currencyId) === currencyId)
    const invById = Object.fromEntries(revenueInvoices.map((i) => [i.id, i]))
    const paidByInvoice = {}
    const pay = payments
        .filter((p) => invById[p.invoiceId] && p.paymentDate)
        .map((p) => ({ ...p, day: dayStr(p.paymentDate, tz), clientId: invById[p.invoiceId].clientId }))
    for (const p of pay) paidByInvoice[p.invoiceId] = round2((paidByInvoice[p.invoiceId] || 0) + (p.amount || 0))
    const inv = revenueInvoices.filter((i) => i.date).map((i) => ({ ...i, day: dayStr(i.date, tz) }))
    const exp = expenses.filter((e) => curOf(e.currencyId) === currencyId && e.date).map((e) => ({ ...e, day: dayStr(e.date, tz) }))

    // ----- generic daily maps
    const dayMap = (rows, dayKey, valueFn = () => 1) => {
        const m = new Map()
        for (const r of rows) m.set(r[dayKey], (m.get(r[dayKey]) || 0) + valueFn(r))
        return m
    }
    const series = (m, days) => days.map((d) => round2(m.get(d) || 0))
    const invoicedMap = dayMap(inv, 'day', (i) => i.total)
    const invoiceCountMap = dayMap(inv, 'day')
    const collectedMap = dayMap(pay, 'day', (p) => p.amount || 0)
    const expensesMap = dayMap(exp, 'day', (e) => e.amount || 0)
    const clientRows = clients.map((c) => ({ ...c, day: dayStr(c.createdAt, tz) }))
    const clientsMap = dayMap(clientRows, 'day')
    const leadRows = leads.map((l) => ({ ...l, day: dayStr(l.createdAt, tz) }))
    const goodLeads = leadRows.filter((l) => !l.junk)
    const leadsMap = dayMap(goodLeads, 'day')
    const wonMap = dayMap(goodLeads.filter((l) => l.clientId), 'day')
    const ticketRows = tickets.map((t) => ({ ...t, day: dayStr(t.createdAt, tz) }))
    const ticketsMap = dayMap(ticketRows, 'day')

    const period = (days) => {
        const invoiced = sum(series(invoicedMap, days))
        const collected = sum(series(collectedMap, days))
        const expenses = sum(series(expensesMap, days))
        const leadsN = sum(series(leadsMap, days))
        const won = sum(series(wonMap, days))
        return {
            invoiced, invoices: sum(series(invoiceCountMap, days)), collected, expenses, net: round2(collected - expenses),
            clients: sum(series(clientsMap, days)), leads: leadsN, won, rate: leadsN ? (won / leadsN) * 100 : 0, tickets: sum(series(ticketsMap, days)),
        }
    }
    const cur = period(R.days)
    const prev = period(R.prevDays)
    const spark = (m) => series(m, R.days)

    // ----- snapshots (not range dependent)
    let outstanding = 0, overdue = 0, overdueCount = 0
    const overdueRows = []
    for (const i of revenueInvoices) {
        const due = round2(i.total - (paidByInvoice[i.id] || 0))
        if (due <= 0) continue
        outstanding = round2(outstanding + due)
        if (i.dueDate && dayStr(i.dueDate, tz) < R.today) {
            overdue = round2(overdue + due)
            overdueCount += 1
            overdueRows.push({ id: i.id, clientId: i.clientId, number: `${i.prefix || ''}${String(i.number).padStart(6, '0')}`, dueDate: i.dueDate, due })
        }
    }
    const clientName = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    overdueRows.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    const openTasks = tasks.filter((t) => t.status !== 5)
    const overdueTasks = openTasks.filter((t) => t.dueDate && dayStr(t.dueDate, tz) < R.today)

    // ----- KPI cards (kept: money + CRM essentials; added: trend/sparkline/breakdown per Ratokil spec)
    const kpis = []
    const dailyNet = R.days.map((d) => round2((collectedMap.get(d) || 0) - (expensesMap.get(d) || 0)))
    const dailyRate = R.days.map((d) => ((leadsMap.get(d) || 0) ? ((wonMap.get(d) || 0) / leadsMap.get(d)) * 100 : 0))
    if (wantInvoices) {
        kpis.push({ key: 'invoiced', label: 'Invoiced', icon: 'receipt', format: 'currency', value: cur.invoiced, trend: delta(cur.invoiced, prev.invoiced), spark: spark(invoicedMap), group: 'money', breakdown: cur.invoices ? [{ label: 'invoices', n: cur.invoices }] : [] })
        kpis.push({ key: 'collected', label: 'Collected', icon: 'coins', format: 'currency', value: cur.collected, trend: delta(cur.collected, prev.collected), spark: spark(collectedMap), group: 'money' })
        kpis.push({ key: 'outstanding', label: 'Outstanding', icon: 'hourglass', format: 'currency', value: outstanding, group: 'money', note: 'All open invoices' })
        kpis.push({ key: 'overdue', label: 'Overdue', icon: 'alert', format: 'currency', value: overdue, group: 'money', lowerIsBetter: true, breakdown: overdueCount ? [{ label: 'invoices', n: overdueCount }] : [], note: 'Past due date' })
    }
    if (wantExpenses) kpis.push({ key: 'expenses', label: 'Expenses', icon: 'wallet', format: 'currency', value: cur.expenses, trend: delta(cur.expenses, prev.expenses), spark: spark(expensesMap), lowerIsBetter: true, group: 'money' })
    if (wantInvoices && wantExpenses) kpis.push({ key: 'net', label: 'Net cash flow', icon: 'trending', format: 'currency', value: cur.net, trend: delta(cur.net, prev.net), spark: dailyNet, group: 'money' })
    if (wantCustomers) kpis.push({ key: 'clients', label: 'New clients', icon: 'users', format: 'number', value: cur.clients, trend: delta(cur.clients, prev.clients), spark: spark(clientsMap), group: 'crm', breakdown: [{ label: 'total', n: clients.length }] })
    if (wantLeads) {
        kpis.push({ key: 'leads', label: 'New leads', icon: 'sparkles', format: 'number', value: cur.leads, trend: delta(cur.leads, prev.leads), spark: spark(leadsMap), group: 'crm' })
        kpis.push({ key: 'won', label: 'Converted leads', icon: 'trophy', format: 'number', value: cur.won, trend: delta(cur.won, prev.won), spark: spark(wonMap), group: 'crm' })
        kpis.push({ key: 'rate', label: 'Conversion rate', icon: 'percent', format: 'percent', value: cur.rate, trend: delta(cur.rate, prev.rate), spark: dailyRate, group: 'crm' })
    }
    if (wantTickets) kpis.push({ key: 'tickets', label: 'Tickets opened', icon: 'lifebuoy', format: 'number', value: cur.tickets, trend: delta(cur.tickets, prev.tickets), spark: spark(ticketsMap), lowerIsBetter: true, group: 'crm' })
    if (wantTasks) kpis.push({ key: 'tasks', label: 'Open tasks', icon: 'check', format: 'number', value: openTasks.length, group: 'crm', lowerIsBetter: true, breakdown: overdueTasks.length ? [{ label: 'overdue', n: overdueTasks.length }] : [], note: 'All open tasks' })

    // ----- time series (revenue over time) bucketed by day, or by week for long ranges
    const bucketize = (days) => {
        if (!weekly) return days.map((d) => [d])
        const out = []
        for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7))
        return out
    }
    const bucketsCur = bucketize(R.days)
    const bucketsPrev = bucketize(R.prevDays)
    const sumDays = (m, ds) => round2(sum(ds.map((d) => m.get(d) || 0)))
    const lbl = (ds) => (ds.length > 1 ? `${ds[0].slice(8)}/${ds[0].slice(5, 7)} – ${ds[ds.length - 1].slice(8)}/${ds[ds.length - 1].slice(5, 7)}` : `${ds[0].slice(8)}/${ds[0].slice(5, 7)}`)
    const metricsFor = (ds) => {
        const invoiced = sumDays(invoicedMap, ds), collected = sumDays(collectedMap, ds), ex = sumDays(expensesMap, ds)
        return { invoiced, collected, expenses: ex, net: round2(collected - ex) }
    }
    const points = bucketsCur.map((ds, i) => {
        const pds = bucketsPrev[i]
        return {
            label: lbl(ds),
            weekday: ds.length === 1 ? new Date(`${ds[0]}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) : 'Week',
            cur: metricsFor(ds),
            prev: pds ? metricsFor(pds) : null,
            prevLabel: pds ? lbl(pds) : '',
        }
    })
    const collectedPts = points.map((p) => p.cur.collected)
    const avgCollected = collectedPts.length ? sum(collectedPts) / collectedPts.length : 0
    const lowest = points.reduce((m, p) => (!m || p.cur.collected < m.cur.collected ? p : m), null)
    const timeSeries = wantInvoices
        ? {
              points, weekly,
              totals: { cur: { invoiced: cur.invoiced, collected: cur.collected, expenses: cur.expenses, net: cur.net }, prev: { invoiced: prev.invoiced, collected: prev.collected, expenses: prev.expenses, net: prev.net } },
              daysBelow: points.filter((p) => p.prev && p.cur.collected < p.prev.collected).length,
              trough: lowest && avgCollected > 0 && lowest.cur.collected < avgCollected * 0.5 ? { label: lowest.label, count: lowest.cur.collected } : null,
          }
        : null

    // ----- lead source × outcome
    let sourceOutcome = null
    if (wantLeads) {
        const srcName = Object.fromEntries(sources.map((s) => [s.id, s.name]))
        const statusName = Object.fromEntries(leadStatuses.map((s) => [s.id, s.name]))
        const names = [...sources.map((s) => s.name)]
        if (goodLeads.concat(leadRows.filter((l) => l.junk)).some((l) => !l.sourceId)) names.push('No source')
        const blank = () => ({ leads: 0, open: 0, won: 0, lost: 0, junk: 0 })
        const rows = names.map((name) => ({ source: name, cur: blank(), prev: blank(), breakdown: { open: {}, won: {}, lost: {}, junk: {} } }))
        const byName = Object.fromEntries(rows.map((r) => [r.source, r]))
        for (const l of leadRows) {
            const which = inCur(l.day) ? 'cur' : inPrev(l.day) ? 'prev' : null
            if (!which) continue
            const row = byName[srcName[l.sourceId] || 'No source']
            if (!row) continue
            const bucket = l.junk ? 'junk' : l.clientId ? 'won' : l.lost ? 'lost' : 'open'
            if (!l.junk) row[which].leads += 1
            row[which][bucket] += 1
            if (which === 'cur') {
                const n = bucket === 'open' ? statusName[l.statusId] || 'No status' : bucket === 'won' ? 'Converted' : bucket === 'lost' ? 'Lost' : 'Junk'
                row.breakdown[bucket][n] = (row.breakdown[bucket][n] || 0) + 1
            }
        }
        sourceOutcome = {
            rows: rows.map((r) => ({ ...r, breakdown: Object.fromEntries(Object.entries(r.breakdown).map(([k, v]) => [k, Object.entries(v).map(([name, count]) => ({ name, count }))])) })),
        }
    }

    // ----- client performance (top N + others)
    let clientPerf = null
    if (wantInvoices) {
        const perf = new Map()
        const row = (id) => {
            if (!perf.has(id)) perf.set(id, { label: clientName[id] || '—', cur: { invoices: 0, invoiced: 0, collected: 0 }, prev: { invoices: 0, invoiced: 0, collected: 0 } })
            return perf.get(id)
        }
        for (const i of inv) {
            const w = inCur(i.day) ? 'cur' : inPrev(i.day) ? 'prev' : null
            if (!w) continue
            const r = row(i.clientId)
            r[w].invoices += 1
            r[w].invoiced = round2(r[w].invoiced + i.total)
        }
        for (const p of pay) {
            const w = inCur(p.day) ? 'cur' : inPrev(p.day) ? 'prev' : null
            if (!w) continue
            const r = row(p.clientId)
            r[w].collected = round2(r[w].collected + (p.amount || 0))
        }
        const all = [...perf.values()].sort((a, b) => b.cur.invoiced - a.cur.invoiced || b.prev.invoiced - a.prev.invoiced)
        const top = all.slice(0, 8)
        const rest = all.slice(8)
        const rows = top.map((r) => ({ ...r, isOthers: false }))
        if (rest.length) {
            const agg = (w) => rest.reduce((s, r) => ({ invoices: s.invoices + r[w].invoices, invoiced: round2(s.invoiced + r[w].invoiced), collected: round2(s.collected + r[w].collected) }), { invoices: 0, invoiced: 0, collected: 0 })
            rows.push({ label: `Others (${rest.length})`, isOthers: true, cur: agg('cur'), prev: agg('prev') })
        }
        const tot = (w) => all.reduce((s, r) => ({ invoices: s.invoices + r[w].invoices, invoiced: round2(s.invoiced + r[w].invoiced), collected: round2(s.collected + r[w].collected) }), { invoices: 0, invoiced: 0, collected: 0 })
        clientPerf = { rows, total: { cur: tot('cur'), prev: tot('prev') } }
    }

    // ----- day × hour heatmap of inbound activity (new leads + new tickets)
    let weekHour = null
    if (wantLeads || wantTickets) {
        const mk = () => Array.from({ length: 7 }, () => Array(BLOCKS.length).fill(0))
        const curM = mk(), prevM = mk()
        const src = Array.from({ length: 7 }, () => Array.from({ length: BLOCKS.length }, () => ({})))
        const events = [...goodLeads.map((l) => ({ t: l.createdAt, day: l.day, type: 'Leads' })), ...ticketRows.map((t) => ({ t: t.createdAt, day: t.day, type: 'Tickets' }))]
        for (const e of events) {
            const w = inCur(e.day) ? 'cur' : inPrev(e.day) ? 'prev' : null
            if (!w) continue
            const { wd, hour } = weekdayHour(e.t, tz)
            const b = blockOf(hour)
            if (wd < 0 || b < 0) continue
            ;(w === 'cur' ? curM : prevM)[wd][b] += 1
            if (w === 'cur') src[wd][b][e.type] = (src[wd][b][e.type] || 0) + 1
        }
        weekHour = { cur: curM, prev: prevM, src: src.map((r) => r.map((c) => Object.entries(c).map(([name, count]) => ({ name, count })))), blocks: BLOCKS.map(([a, b]) => `${a}–${b}h`), weekdays: WEEKDAYS }
    }

    // ----- cities (zone bars with drill-down to clients)
    let cities = null
    if (wantInvoices) {
        const cityOf = (cid) => clients.find((c) => c.id === cid)?.city || 'No city'
        const clientCity = Object.fromEntries(clients.map((c) => [c.id, c.city || 'No city']))
        const zones = new Map()
        const z = (name) => {
            if (!zones.has(name)) zones.set(name, { zone: name, special: name === 'No city', cur: { clients: 0, invoiced: 0, collected: 0 }, prev: { clients: 0, invoiced: 0, collected: 0 }, children: new Map(), seen: { cur: new Set(), prev: new Set() } })
            return zones.get(name)
        }
        const child = (zone, id) => {
            if (!zone.children.has(id)) zone.children.set(id, { name: clientName[id] || '—', clientId: id, cur: { invoiced: 0, collected: 0 }, prev: { invoiced: 0, collected: 0 } })
            return zone.children.get(id)
        }
        void cityOf
        for (const i of inv) {
            const w = inCur(i.day) ? 'cur' : inPrev(i.day) ? 'prev' : null
            if (!w) continue
            const zone = z(clientCity[i.clientId] || 'No city')
            zone[w].invoiced = round2(zone[w].invoiced + i.total)
            if (!zone.seen[w].has(i.clientId)) {
                zone.seen[w].add(i.clientId)
                zone[w].clients += 1
            }
            const c = child(zone, i.clientId)
            c[w].invoiced = round2(c[w].invoiced + i.total)
        }
        for (const p of pay) {
            const w = inCur(p.day) ? 'cur' : inPrev(p.day) ? 'prev' : null
            if (!w) continue
            const zone = z(clientCity[p.clientId] || 'No city')
            zone[w].collected = round2(zone[w].collected + (p.amount || 0))
            child(zone, p.clientId)[w].collected = round2(child(zone, p.clientId)[w].collected + (p.amount || 0))
        }
        const rows = [...zones.values()]
            .map((zn) => ({ zone: zn.zone, special: zn.special, cur: zn.cur, prev: zn.prev, cities: [...zn.children.values()].sort((a, b) => b.cur.invoiced - a.cur.invoiced) }))
            .sort((a, b) => (a.special - b.special) || b.cur.invoiced - a.cur.invoiced || b.prev.invoiced - a.prev.invoiced)
        const tot = (w) => rows.reduce((s, r) => ({ clients: s.clients + r[w].clients, invoiced: round2(s.invoiced + r[w].invoiced), collected: round2(s.collected + r[w].collected) }), { clients: 0, invoiced: 0, collected: 0 })
        cities = { rows, total: { cur: tot('cur'), prev: tot('prev') }, noCity: clients.filter((c) => !c.city).length, clientCount: clients.length }
    }

    // ----- lists
    const lists = {
        overdue: wantInvoices ? overdueRows.slice(0, 6).map((o) => ({ ...o, company: clientName[o.clientId] || '' })) : null,
        payments: wantInvoices
            ? pay.filter((p) => inCur(p.day)).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 6).map((p) => ({ id: p.id, amount: p.amount, date: p.paymentDate, invoiceId: p.invoiceId, company: clientName[p.clientId] || '' }))
            : null,
        tasks: wantTasks
            ? openTasks.filter((t) => t.dueDate && dayStr(t.dueDate, tz) >= R.today && dayStr(t.dueDate, tz) <= addDays(R.today, 7)).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 6).map((t) => ({ id: t.id, name: t.name, dueDate: t.dueDate }))
            : null,
    }

    return {
        generatedAt: new Date().toISOString(),
        range: { key: R.key, label: R.label, from: R.from, to: R.to, prevFrom: R.prevFrom, prevTo: R.prevTo, days: R.days.length, weekly, tz },
        currencyId,
        currencies: currencyList,
        kpis,
        timeSeries,
        sourceOutcome,
        clientPerf,
        weekHour,
        cities,
        lists,
        footer: { invoices: cur.invoices, invoiced: cur.invoiced, collected: cur.collected, leads: cur.leads, won: cur.won, junk: leadRows.filter((l) => l.junk && inCur(l.day)).length },
    }
}
