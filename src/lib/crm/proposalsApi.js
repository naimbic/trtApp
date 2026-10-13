import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { effectiveStatus, numberFormatter, numberOf, LABEL, EXPIRED } from '@/lib/crm/proposalDoc'

const NAME = { ...LABEL, [EXPIRED]: 'Expired' }

const ownWhere = async (session) => {
    if (viewScope(session.user.authority || [], 'proposals') === 'all') return {}
    const staffId = await getStaffId(session)
    return staffId ? { OR: [{ addedFrom: staffId }, { assignedId: staffId }] } : { id: '000000000000000000000000' }
}

export async function listProposals({ query = '', status, relType, currencyId, from, to, pageIndex = 1, pageSize = 15, sortKey = 'date', order = 'desc' } = {}) {
    const session = await requirePermission('proposals', 'view')
    const where = { AND: [await ownWhere(session), relType ? { relType } : {}, currencyId ? { currencyId } : {}, from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}) } } : {}] }
    const raw = await prisma.crmProposal.findMany({ where, select: { id: true, legacyId: true, number: true, subject: true, proposalTo: true, relType: true, total: true, currencyId: true, date: true, openTill: true, status: true, invoiceId: true, estimateId: true } })
    const fmt = await numberFormatter()
    let rows = raw.map((p) => { const st = effectiveStatus(p); return { id: p.id, number: fmt(p), numberRaw: numberOf(p), subject: p.subject || '', to: p.proposalTo || '', relType: p.relType, total: p.total || 0, currencyId: p.currencyId, date: p.date, openTill: p.openTill, status: st, statusLabel: NAME[st], converted: !!(p.invoiceId || p.estimateId) } })
    const counts = {}, money = {}
    for (const r of rows) {
        counts[r.status] = (counts[r.status] || 0) + 1
        if ([6, 2].includes(r.status)) continue
        const m = (money[r.currencyId || 'none'] ||= { open: 0, accepted: 0 })
        if ([1, 4, 5].includes(r.status)) m.open = round2(m.open + r.total)
        if (r.status === 3) m.accepted = round2(m.accepted + r.total)
    }
    const q = query.trim().toLowerCase()
    if (status) rows = rows.filter((r) => String(r.status) === String(status))
    if (q) rows = rows.filter((r) => r.number.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || r.to.toLowerCase().includes(q))
    const dir = order === 'asc' ? 1 : -1
    const keyFn = { number: (r) => r.numberRaw, subject: (r) => r.subject.toLowerCase(), to: (r) => r.to.toLowerCase(), date: (r) => +new Date(r.date || 0), openTill: (r) => +new Date(r.openTill || 0), total: (r) => r.total, status: (r) => r.status }[sortKey] || ((r) => +new Date(r.date || 0))
    rows.sort((a, b) => (keyFn(a) > keyFn(b) ? dir : keyFn(a) < keyFn(b) ? -dir : 0))
    const page = Math.max(parseInt(pageIndex, 10) || 1, 1), size = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 200)
    return { list: rows.slice((page - 1) * size, page * size), total: rows.length, pageIndex: page, pageSize: size, stats: { counts, money } }
}
