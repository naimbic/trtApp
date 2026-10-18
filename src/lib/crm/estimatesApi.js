import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { trendOf } from '@/lib/crm/trend'

const LABEL = { 1: 'Draft', 2: 'Sent', 3: 'Declined', 4: 'Accepted', 5: 'Expired' }
const day = (d) => new Date(d).toISOString().slice(0, 10)
const effective = (e, today) => (e.status === 2 && e.expiryDate && day(e.expiryDate) < today ? 5 : e.status)

const ownWhere = async (session) => {
    if (viewScope(session.user.authority || [], 'estimates') === 'all') return {}
    const staffId = await getStaffId(session)
    return staffId ? { OR: [{ addedFrom: staffId }, { saleAgentId: staffId }] } : { id: '000000000000000000000000' }
}

export async function listEstimates({ query = '', status, clientId, currencyId, from, to, pageIndex = 1, pageSize = 15, sortKey = 'date', order = 'desc' } = {}) {
    const session = await requirePermission('estimates', 'view')
    const where = { AND: [await ownWhere(session), clientId ? { clientId } : {}, currencyId ? { currencyId } : {}, from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}) } } : {}] }
    const rows0 = await prisma.crmEstimate.findMany({ where, select: { id: true, clientId: true, number: true, prefix: true, numberFormat: true, date: true, expiryDate: true, total: true, currencyId: true, status: true, invoiceId: true, referenceNo: true } })
    const padding = await numberPadding()
    const clients = await prisma.crmClient.findMany({ where: { id: { in: [...new Set(rows0.map((r) => r.clientId).filter(Boolean))] } }, select: { id: true, company: true } })
    const cname = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    const today = day(new Date())
    let rows = rows0.map((e) => { const st = effective(e, today); return { id: e.id, number: docNumberOf(e, padding, null), numberRaw: e.number, clientId: e.clientId, client: cname[e.clientId] || '', date: e.date, expiryDate: e.expiryDate, total: e.total, currencyId: e.currencyId, status: st, statusLabel: LABEL[st], invoiced: !!e.invoiceId, referenceNo: e.referenceNo || '' } })
    const counts = {}
    for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1
    const tally = (list) => {
        const money = {}
        for (const r of list) {
            const m = (money[r.currencyId || 'none'] ||= { total: 0, open: 0, accepted: 0 })
            m.total = round2(m.total + r.total)
            if (r.status === 2) m.open = round2(m.open + r.total)
            if (r.status === 4) m.accepted = round2(m.accepted + r.total)
        }
        return money
    }
    const money = tally(rows)
    const trend = trendOf(rows, (r) => r.date, tally)
    const q = query.trim().toLowerCase()
    if (status) rows = rows.filter((r) => String(r.status) === String(status))
    if (q) rows = rows.filter((r) => r.number.toLowerCase().includes(q) || r.client.toLowerCase().includes(q) || r.referenceNo.toLowerCase().includes(q) || String(r.numberRaw) === q)
    const dir = order === 'asc' ? 1 : -1
    const keyFn = { number: (r) => r.numberRaw, client: (r) => r.client.toLowerCase(), date: (r) => +new Date(r.date || 0), expiryDate: (r) => +new Date(r.expiryDate || 0), total: (r) => r.total, status: (r) => r.status }[sortKey] || ((r) => +new Date(r.date || 0))
    rows.sort((a, b) => (keyFn(a) > keyFn(b) ? dir : keyFn(a) < keyFn(b) ? -dir : 0))
    const page = Math.max(parseInt(pageIndex, 10) || 1, 1), size = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 200)
    return { list: rows.slice((page - 1) * size, page * size), total: rows.length, pageIndex: page, pageSize: size, stats: { counts, money, trend } }
}
