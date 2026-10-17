import prisma from '@/lib/prisma'

// The figures the AI is given (and the screen draws): computed here from the database, never invented by the model.
// Only totals, rates and company names leave the server: no emails, phone numbers or addresses.
const DAY = 86400000
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null)
const ymKey = (d) => new Date(d).toISOString().slice(0, 7)
const person = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || 'Unassigned'
const lastMonths = (n, from = new Date()) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - (n - 1 - i), 1)); return d.toISOString().slice(0, 7) })
const bump = (o, k, by = 1) => { o[k] = (o[k] || 0) + by }

export async function leadsData() {
    const [leads, statuses, sources, staff] = await Promise.all([
        prisma.crmLead.findMany({ select: { createdAt: true, statusId: true, sourceId: true, assigned: true, lost: true, junk: true, clientId: true, dateConverted: true, lastContact: true }, take: 50000 }),
        prisma.crmLeadStatus.findMany({ select: { id: true, name: true } }),
        prisma.crmLeadSource.findMany({ select: { id: true, name: true } }),
        prisma.crmStaff.findMany({ select: { id: true, firstName: true, lastName: true, email: true } }),
    ])
    const st = Object.fromEntries(statuses.map((s) => [s.id, s.name])), so = Object.fromEntries(sources.map((s) => [s.id, s.name])), sf = Object.fromEntries(staff.map((s) => [s.id, person(s)]))
    const now = Date.now()
    const converted = leads.filter((l) => l.clientId), lost = leads.filter((l) => l.lost), junk = leads.filter((l) => l.junk)
    const open = leads.filter((l) => !l.clientId && !l.lost && !l.junk)
    const byStatus = {}, bySource = {}, byOwner = {}
    for (const l of open) bump(byStatus, st[l.statusId] || 'No status')
    for (const l of leads.filter((x) => !x.junk)) { const k = so[l.sourceId] || 'No source'; (bySource[k] ||= { total: 0, converted: 0, lost: 0 }).total++; if (l.clientId) bySource[k].converted++; if (l.lost) bySource[k].lost++ }
    for (const l of leads.filter((x) => !x.junk)) { const k = sf[l.assigned] || 'Unassigned'; (byOwner[k] ||= { open: 0, converted: 0, lost: 0, total: 0 }).total++; if (l.clientId) byOwner[k].converted++; else if (l.lost) byOwner[k].lost++; else byOwner[k].open++ }
    const months = lastMonths(12)
    const created = Object.fromEntries(months.map((m) => [m, 0])), conv = Object.fromEntries(months.map((m) => [m, 0]))
    for (const l of leads) { const m = ymKey(l.createdAt); if (m in created) created[m]++; if (l.dateConverted) { const c = ymKey(l.dateConverted); if (c in conv) conv[c]++ } }
    const days = converted.filter((l) => l.dateConverted).map((l) => Math.max(0, (new Date(l.dateConverted) - new Date(l.createdAt)) / DAY))
    const qualified = leads.length - junk.length
    return {
        total: leads.length, open: open.length, converted: converted.length, lost: lost.length, junk: junk.length,
        conversionRatePct: qualified ? r2((converted.length / qualified) * 100) : null,
        avgDaysToConvert: days.length ? r2(days.reduce((a, b) => a + b, 0) / days.length) : null,
        openByStatus: byStatus,
        sources: Object.entries(bySource).map(([name, v]) => ({ name, ...v, conversionRatePct: v.total ? r2((v.converted / v.total) * 100) : 0 })).sort((a, b) => b.total - a.total).slice(0, 12),
        owners: Object.entries(byOwner).map(([name, v]) => ({ name, ...v, conversionRatePct: v.total ? r2((v.converted / v.total) * 100) : 0 })).sort((a, b) => b.total - a.total).slice(0, 12),
        last12Months: months.map((m) => ({ month: m, created: created[m], converted: conv[m] })),
        attention: {
            neverContacted: open.filter((l) => !l.lastContact).length,
            noContactFor30Days: open.filter((l) => l.lastContact && now - +new Date(l.lastContact) > 30 * DAY).length,
            openOlderThan90Days: open.filter((l) => now - +new Date(l.createdAt) > 90 * DAY).length,
            openWithoutOwner: open.filter((l) => !l.assigned).length,
        },
    }
}

/** Invoices (without drafts and cancelled), payments and the currencies, shared by the client and income figures. */
async function money() {
    const [invoices, payments, currencies] = await Promise.all([
        prisma.crmInvoice.findMany({ where: { status: { notIn: [5, 6] }, date: { not: null } }, select: { id: true, clientId: true, total: true, status: true, date: true, dueDate: true, currencyId: true }, take: 200000 }),
        prisma.crmPayment.findMany({ select: { invoiceId: true, amount: true, paymentDate: true, invoice: { select: { currencyId: true } } }, take: 200000 }),
        prisma.crmCurrency.findMany({ select: { id: true, name: true, symbol: true, isDefault: true } }),
    ])
    const cur = Object.fromEntries(currencies.map((c) => [c.id, c.name || c.symbol]))
    const defaultCur = currencies.find((c) => c.isDefault)
    const paidBy = {}
    for (const p of payments) if (p.invoiceId) bump(paidBy, p.invoiceId, p.amount || 0)
    return { invoices, payments, cur, curName: (id) => cur[id] || defaultCur?.name || 'Default currency', paidBy }
}

export async function clientsData() {
    const [clients, { invoices, curName, paidBy }] = await Promise.all([
        prisma.crmClient.findMany({ select: { id: true, company: true, active: true, createdAt: true, industry: true }, take: 50000 }),
        money(),
    ])
    const name = Object.fromEntries(clients.map((c) => [c.id, c.company || '(no name)']))
    const now = Date.now(), yearAgo = now - 365 * DAY
    const per = {} // client -> currency -> figures
    for (const i of invoices) {
        if (!i.clientId) continue
        const c = ((per[i.clientId] ||= {})[curName(i.currencyId)] ||= { invoiced: 0, paid: 0, outstanding: 0, overdue: 0, last: 0, first: Infinity, invoices: 0 })
        const paid = paidBy[i.id] || 0
        c.invoiced += i.total || 0; c.paid += paid; c.invoices++
        if ([1, 3, 4].includes(i.status)) { const due = Math.max(0, (i.total || 0) - paid); c.outstanding += due; if (i.status === 4) c.overdue += due }
        const t = +new Date(i.date); c.last = Math.max(c.last, t); c.first = Math.min(c.first, t)
    }
    const flat = []
    for (const [id, byCur] of Object.entries(per)) for (const [currency, v] of Object.entries(byCur)) flat.push({ id, company: name[id] || '(deleted client)', currency, ...v })
    const mainCurrency = Object.entries(flat.reduce((a, f) => { bump(a, f.currency, f.invoiced); return a }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    const main = flat.filter((f) => f.currency === mainCurrency)
    const totalMain = main.reduce((a, f) => a + f.invoiced, 0)
    const round = (f) => ({ company: f.company, currency: f.currency, invoiced: r2(f.invoiced), paid: r2(f.paid), outstanding: r2(f.outstanding), overdue: r2(f.overdue), invoices: f.invoices, customerSince: f.first === Infinity ? null : new Date(f.first).toISOString().slice(0, 10), lastInvoice: f.last ? new Date(f.last).toISOString().slice(0, 10) : null })
    const withInvoices = new Set(flat.map((f) => f.id))
    const dormant = main.filter((f) => f.last && f.last < yearAgo).sort((a, b) => b.invoiced - a.invoiced)
    const newPerYear = {}, byIndustry = {}
    for (const c of clients) { bump(newPerYear, new Date(c.createdAt).getUTCFullYear()); bump(byIndustry, c.industry || 'Not set') }
    return {
        total: clients.length, active: clients.filter((c) => c.active).length, inactive: clients.filter((c) => !c.active).length,
        neverInvoiced: clients.filter((c) => !withInvoices.has(c.id)).length, currency: mainCurrency,
        topClientsByInvoiced: [...main].sort((a, b) => b.invoiced - a.invoiced).slice(0, 10).map(round),
        top5SharePct: totalMain ? r2((main.sort((a, b) => b.invoiced - a.invoiced).slice(0, 5).reduce((a, f) => a + f.invoiced, 0) / totalMain) * 100) : null,
        clientsWithOverdue: { count: main.filter((f) => f.overdue > 0).length, totalOverdue: r2(main.reduce((a, f) => a + f.overdue, 0)), top: [...main].filter((f) => f.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 5).map(round) },
        totalOutstanding: r2(main.reduce((a, f) => a + f.outstanding, 0)),
        dormantOverAYear: { count: dormant.length, biggestPast: dormant.slice(0, 5).map(round) },
        newClientsPerYear: newPerYear,
        industries: Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([industry, count]) => ({ industry, count })),
    }
}

export async function incomeData() {
    const [{ invoices, payments, curName }, expenses] = await Promise.all([money(), prisma.crmExpense.findMany({ select: { amount: true, date: true, currencyId: true }, take: 200000 })])
    const per = {} // currency -> year -> figures
    const slot = (currency, y) => ((per[currency] ||= {})[y] ||= { invoiced: 0, invoices: 0, collected: 0, expenses: 0, months: {} })
    for (const i of invoices) { const d = new Date(i.date), s = slot(curName(i.currencyId), d.getUTCFullYear()); s.invoiced += i.total || 0; s.invoices++; bump(s.months, ymKey(d), i.total || 0) }
    for (const p of payments) if (p.paymentDate) slot(curName(p.invoice?.currencyId), new Date(p.paymentDate).getUTCFullYear()).collected += p.amount || 0
    for (const e of expenses) if (e.date) slot(curName(e.currencyId), new Date(e.date).getUTCFullYear()).expenses += e.amount || 0
    const nowY = new Date().getUTCFullYear(), nowM = new Date().getUTCMonth()
    const build = (currency) => {
        const ys = Object.keys(per[currency]).map(Number).sort((a, b) => a - b)
        return ys.map((y, idx) => {
            const s = per[currency][y], prev = per[currency][y - 1]
            const best = Object.entries(s.months).sort((a, b) => b[1] - a[1])[0]
            return { year: y, invoiced: r2(s.invoiced), invoices: s.invoices, avgInvoice: s.invoices ? r2(s.invoiced / s.invoices) : 0, collected: r2(s.collected), expenses: r2(s.expenses), netCollectedMinusExpenses: r2(s.collected - s.expenses), invoicedChangePct: prev ? pct(s.invoiced, prev.invoiced) : null, collectedChangePct: prev ? pct(s.collected, prev.collected) : null, bestMonth: best ? { month: best[0], invoiced: r2(best[1]) } : null, partialYear: y === nowY, firstYear: idx === 0 }
        })
    }
    const lifetime = (currency) => Object.values(per[currency]).reduce((a, s) => ({ invoiced: a.invoiced + s.invoiced, collected: a.collected + s.collected, expenses: a.expenses + s.expenses }), { invoiced: 0, collected: 0, expenses: 0 })
    const currencies = Object.keys(per).sort((a, b) => lifetime(b).invoiced - lifetime(a).invoiced)
    const mainName = currencies[0] || null
    const monthsOf = (y) => Array.from({ length: 12 }, (_, m) => r2(per[mainName]?.[y]?.months?.[`${y}-${String(m + 1).padStart(2, '0')}`] || 0))
    const ytd = mainName ? (() => { const cur = monthsOf(nowY).slice(0, nowM + 1).reduce((a, b) => a + b, 0), prev = monthsOf(nowY - 1).slice(0, nowM + 1).reduce((a, b) => a + b, 0); return { year: nowY, throughMonth: nowM + 1, invoiced: r2(cur), samePeriodLastYear: r2(prev), changePct: pct(cur, prev) } })() : null
    return {
        mainCurrency: mainName, years: mainName ? build(mainName) : [],
        lifetime: mainName ? Object.fromEntries(Object.entries(lifetime(mainName)).map(([k, v]) => [k, r2(v)])) : null,
        yearToDate: ytd, monthlyThisYear: mainName ? monthsOf(nowY) : [], monthlyLastYear: mainName ? monthsOf(nowY - 1) : [],
        otherCurrencies: currencies.slice(1, 4).map((c) => ({ currency: c, years: build(c) })),
        note: 'Amounts are per currency and never converted; "invoiced" excludes drafts and cancelled invoices; "collected" is the payments received in the year.',
    }
}

export const COLLECT = { leads: leadsData, clients: clientsData, income: incomeData }
