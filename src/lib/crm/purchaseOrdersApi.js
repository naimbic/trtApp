import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'

const LABEL = { 1: 'Draft', 2: 'Sent', 3: 'Confirmed', 4: 'Delivered', 5: 'Cancelled' }

const ownWhere = async (session) => {
    if (viewScope(session.user.authority || [], 'purchase_orders') === 'all') return {}
    const staffId = await getStaffId(session)
    return staffId ? { OR: [{ addedFrom: staffId }, { saleAgentId: staffId }] } : { id: '000000000000000000000000' }
}

export async function listPurchaseOrders({ query = '', status, clientId, currencyId, from, to, pageIndex = 1, pageSize = 15, sortKey = 'date', order = 'desc' } = {}) {
    const session = await requirePermission('purchase_orders', 'view')
    const where = { AND: [await ownWhere(session), clientId ? { clientId } : {}, currencyId ? { currencyId } : {}, from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}) } } : {}] }
    const raw = await prisma.crmPurchaseOrder.findMany({ where, select: { id: true, clientId: true, number: true, prefix: true, numberFormat: true, date: true, deliveryDate: true, total: true, currencyId: true, status: true, invoiceId: true, referenceNo: true } })
    const padding = await numberPadding()
    const clients = await prisma.crmClient.findMany({ where: { id: { in: [...new Set(raw.map((r) => r.clientId).filter(Boolean))] } }, select: { id: true, company: true } })
    const cname = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    let rows = raw.map((p) => ({ id: p.id, number: docNumberOf(p, padding, null), numberRaw: p.number, clientId: p.clientId, client: cname[p.clientId] || '', date: p.date, deliveryDate: p.deliveryDate, total: p.total, currencyId: p.currencyId, status: p.status, statusLabel: LABEL[p.status], invoiced: !!p.invoiceId, referenceNo: p.referenceNo || '' }))
    const counts = {}, money = {}
    for (const r of rows) {
        counts[r.status] = (counts[r.status] || 0) + 1
        if (r.status === 5) continue
        const m = (money[r.currencyId || 'none'] ||= { total: 0, toDeliver: 0, uninvoiced: 0 })
        m.total = round2(m.total + r.total)
        if ([2, 3].includes(r.status)) m.toDeliver = round2(m.toDeliver + r.total)
        if (!r.invoiced && r.status !== 1) m.uninvoiced = round2(m.uninvoiced + r.total)
    }
    const q = query.trim().toLowerCase()
    if (status) rows = rows.filter((r) => String(r.status) === String(status))
    if (q) rows = rows.filter((r) => r.number.toLowerCase().includes(q) || r.client.toLowerCase().includes(q) || r.referenceNo.toLowerCase().includes(q) || String(r.numberRaw) === q)
    const dir = order === 'asc' ? 1 : -1
    const keyFn = { number: (r) => r.numberRaw, client: (r) => r.client.toLowerCase(), date: (r) => +new Date(r.date || 0), deliveryDate: (r) => +new Date(r.deliveryDate || 0), total: (r) => r.total, status: (r) => r.status }[sortKey] || ((r) => +new Date(r.date || 0))
    rows.sort((a, b) => (keyFn(a) > keyFn(b) ? dir : keyFn(a) < keyFn(b) ? -dir : 0))
    const page = Math.max(parseInt(pageIndex, 10) || 1, 1), size = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 200)
    return { list: rows.slice((page - 1) * size, page * size), total: rows.length, pageIndex: page, pageSize: size, stats: { counts, money } }
}
