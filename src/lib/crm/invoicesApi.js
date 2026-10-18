import prisma from '@/lib/prisma'
import { readSettings } from '@/lib/crm/appSettings'
import { requirePermission, viewScope, getStaffId } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { trendOf } from '@/lib/crm/trend'
import { tallyWithAll, toBase } from '@/lib/crm/rates'
import { loadRates } from '@/lib/crm/ratesDb'

const STATUS_LABEL = { 1: 'Unpaid', 2: 'Paid', 3: 'Partially paid', 4: 'Overdue', 5: 'Cancelled', 6: 'Draft' }
const day = (d) => new Date(d).toISOString().slice(0, 10)

/** Effective Perfex status: overdue is derived from the due date, paid/partial from the payments. */
const effective = (i, paid, today) => {
    if (i.status === 5 || i.status === 6) return i.status
    const due = round2(i.total - paid)
    if (due <= 0) return 2
    if (i.dueDate && day(i.dueDate) < today) return 4
    return paid > 0 ? 3 : 1
}

const ownWhere = async (session, feature) => {
    if (viewScope(session.user.authority || [], feature) === 'all') return {}
    const staffId = await getStaffId(session)
    const assigned = (await readSettings(['allow_staff_view_invoices_assigned'])).on('allow_staff_view_invoices_assigned') // Settings → Invoices
    return staffId ? { OR: [{ addedFrom: staffId }, ...(assigned ? [{ saleAgentId: staffId }] : [])] } : { id: '000000000000000000000000' }
}

const paginate = (rows, pageIndex, pageSize) => {
    const page = Math.max(parseInt(pageIndex, 10) || 1, 1)
    const size = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 200)
    return { page, size, list: rows.slice((page - 1) * size, page * size) }
}

/** Filters: query (number/client), status (effective code), clientId, currencyId, from/to (invoice date). */
export async function listInvoices({ query = '', status, clientId, currencyId, from, to, pageIndex = 1, pageSize = 15, sortKey = 'date', order = 'desc' } = {}) {
    const session = await requirePermission('invoices', 'view')
    const scope = await ownWhere(session, 'invoices')
    const where = { AND: [scope, clientId ? { clientId } : {}, currencyId ? { currencyId } : {}, from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}) } } : {}] }
    const invoices = await prisma.crmInvoice.findMany({ where, select: { id: true, clientId: true, number: true, prefix: true, numberFormat: true, date: true, dueDate: true, total: true, currencyId: true, status: true, sent: true, recurring: true } })
    const padding = await numberPadding()
    const payments = await prisma.crmPayment.findMany({ where: { invoiceId: { in: invoices.map((i) => i.id) } }, select: { invoiceId: true, amount: true, paymentDate: true } })
    const paid = {}
    payments.forEach((p) => (paid[p.invoiceId] = round2((paid[p.invoiceId] || 0) + (p.amount || 0))))
    const clients = await prisma.crmClient.findMany({ where: { id: { in: [...new Set(invoices.map((i) => i.clientId).filter(Boolean))] } }, select: { id: true, company: true } })
    const cname = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    const today = day(new Date())

    let rows = invoices.map((i) => {
        const p = paid[i.id] || 0
        const st = effective(i, p, today)
        return { id: i.id, number: docNumberOf(i, padding), numberRaw: i.number, clientId: i.clientId, client: cname[i.clientId] || '', date: i.date, dueDate: i.dueDate, total: i.total, paid: p, due: i.status === 5 || i.status === 6 ? 0 : round2(Math.max(i.total - p, 0)), currencyId: i.currencyId, status: st, statusLabel: STATUS_LABEL[st], sent: i.sent, recurring: i.recurring > 0 }
    })

    // stats ignore the status filter so the cards stay meaningful
    const statCounts = {}
    for (const r of rows) statCounts[r.status] = (statCounts[r.status] || 0) + 1
    const tally = (list) => {
        const money = {}
        for (const r of list) {
            if (r.status === 5 || r.status === 6) continue
            const m = (money[r.currencyId || 'none'] ||= { invoiced: 0, paid: 0, outstanding: 0, overdue: 0 })
            m.invoiced = round2(m.invoiced + r.total)
            m.paid = round2(m.paid + r.paid)
            m.outstanding = round2(m.outstanding + r.due)
            if (r.status === 4) m.overdue = round2(m.overdue + r.due)
        }
        return money
    }
    const rt = await loadRates()
    const tallyAll = (list) => tallyWithAll(tally, list, ['total', 'paid', 'due'], rt)
    const money = tallyAll(rows)
    const trend = trendOf(rows, (r) => r.date, tallyAll)
    const ratesMissing = rt.missing

    // the charts: invoiced (by invoice date) and collected (by payment date) per bucket, for every currency in the cards
    const startOfDay = (d) => new Date(`${day(d)}T00:00:00Z`)
    const winTo = to ? startOfDay(to) : startOfDay(new Date())
    const winFrom = from ? startOfDay(from) : new Date(Date.UTC(winTo.getUTCFullYear(), winTo.getUTCMonth() - 11, 1))
    const spanDays = Math.round((winTo - winFrom) / 86400000) + 1
    const byDay = spanDays <= 62
    const bucket = (d) => (byDay ? day(d) : day(d).slice(0, 7))
    const keys = []
    if (byDay) for (let i = 0; i < spanDays; i++) keys.push(day(new Date(winFrom.getTime() + i * 86400000)))
    else for (let d = new Date(Date.UTC(winFrom.getUTCFullYear(), winFrom.getUTCMonth(), 1)); d <= winTo && keys.length < 60; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) keys.push(day(d).slice(0, 7))
    const curOf = Object.fromEntries(rows.map((r) => [r.id, r.currencyId || 'none']))
    const seriesFor = (key) => {
        const inv = Object.fromEntries(keys.map((k) => [k, 0])), col = { ...inv }
        const conv = (amt, cid) => (key === 'all' ? toBase(amt, cid === 'none' ? null : cid, rt) : cid === key ? amt : 0)
        for (const r of rows) { if (r.status === 5 || r.status === 6) continue; const b = bucket(r.date); if (b in inv) inv[b] = round2(inv[b] + (conv(r.total, r.currencyId || 'none') || 0)) }
        for (const p of payments) { if (!p.paymentDate) continue; const b = bucket(p.paymentDate); if (b in col) col[b] = round2(col[b] + (conv(p.amount, curOf[p.invoiceId]) || 0)) }
        return { labels: keys, invoiced: keys.map((k) => inv[k]), collected: keys.map((k) => col[k]), byDay }
    }
    const series = Object.fromEntries(Object.keys(money).map((k) => [k, seriesFor(k)]))

    const q = query.trim().toLowerCase()
    if (status) rows = rows.filter((r) => String(r.status) === String(status))
    if (q) rows = rows.filter((r) => r.number.toLowerCase().includes(q) || r.client.toLowerCase().includes(q) || String(r.numberRaw) === q)
    const dir = order === 'asc' ? 1 : -1
    const keyFn = { number: (r) => r.numberRaw, client: (r) => r.client.toLowerCase(), date: (r) => +new Date(r.date || 0), dueDate: (r) => +new Date(r.dueDate || 0), total: (r) => r.total, due: (r) => r.due, status: (r) => r.status }[sortKey] || ((r) => +new Date(r.date || 0))
    rows.sort((a, b) => (keyFn(a) > keyFn(b) ? dir : keyFn(a) < keyFn(b) ? -dir : 0))
    const { page, size, list } = paginate(rows, pageIndex, pageSize)
    return { list, total: rows.length, pageIndex: page, pageSize: size, stats: { counts: statCounts, money, trend, ratesMissing, series } }
}

export async function listPayments({ query = '', modeId, clientId, from, to, pageIndex = 1, pageSize = 15, sortKey = 'paymentDate', order = 'desc' } = {}) {
    const session = await requirePermission('payments', 'view')
    // payments follow the invoices the user may see (view_own on payments is based on invoices)
    const invScope = await ownWhere(session, viewScope(session.user.authority || [], 'payments') === 'all' ? 'payments' : 'invoices')
    const invoices = await prisma.crmInvoice.findMany({ where: { AND: [invScope, clientId ? { clientId } : {}] }, select: { id: true, clientId: true, number: true, prefix: true, numberFormat: true, date: true, status: true, currencyId: true } })
    const padding = await numberPadding()
    const byId = Object.fromEntries(invoices.map((i) => [i.id, i]))
    const payWhere = { AND: [{ invoiceId: { in: invoices.map((i) => i.id) } }, modeId ? { paymentModeId: modeId } : {}, from || to ? { paymentDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}) } } : {}] }
    const [payments, modes, clients] = await Promise.all([
        prisma.crmPayment.findMany({ where: payWhere }),
        prisma.crmPaymentMode.findMany(),
        prisma.crmClient.findMany({ where: { id: { in: [...new Set(invoices.map((i) => i.clientId).filter(Boolean))] } }, select: { id: true, company: true } }),
    ])
    const mode = Object.fromEntries(modes.map((m) => [m.id, m.name]))
    const cname = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    let rows = payments.map((p) => {
        const i = byId[p.invoiceId]
        return { id: p.id, amount: p.amount, paymentDate: p.paymentDate, modeId: p.paymentModeId, mode: mode[p.paymentModeId] || p.paymentMethod || '', transactionId: p.transactionId || '', note: p.note || '', invoiceId: p.invoiceId, invoiceNumber: i ? docNumberOf(i, padding) : '', clientId: i?.clientId || null, client: cname[i?.clientId] || '', currencyId: i?.currencyId || null }
    })
    const sumBy = (list) => { const t = {}; list.forEach((r) => (t[r.currencyId || 'none'] = round2((t[r.currencyId || 'none'] || 0) + r.amount))); return t }
    const rt = await loadRates()
    const sumAll = (list) => tallyWithAll(sumBy, list, ['amount'], rt)
    const totals = sumAll(rows)
    const trend = trendOf(rows, (r) => r.paymentDate, sumAll)
    const q = query.trim().toLowerCase()
    if (q) rows = rows.filter((r) => r.invoiceNumber.toLowerCase().includes(q) || r.client.toLowerCase().includes(q) || r.transactionId.toLowerCase().includes(q) || r.mode.toLowerCase().includes(q))
    const dir = order === 'asc' ? 1 : -1
    const keyFn = { paymentDate: (r) => +new Date(r.paymentDate || 0), amount: (r) => r.amount, client: (r) => r.client.toLowerCase(), invoiceNumber: (r) => r.invoiceNumber, mode: (r) => r.mode.toLowerCase() }[sortKey] || ((r) => +new Date(r.paymentDate || 0))
    rows.sort((a, b) => (keyFn(a) > keyFn(b) ? dir : keyFn(a) < keyFn(b) ? -dir : 0))
    const { page, size, list } = paginate(rows, pageIndex, pageSize)
    return { list, total: rows.length, pageIndex: page, pageSize: size, totals, trend, modes: modes.map((m) => ({ id: m.id, name: m.name })) }
}
