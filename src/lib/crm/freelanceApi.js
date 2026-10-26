import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId, hasCap } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { toBase } from '@/lib/crm/rates'
import { loadRates } from '@/lib/crm/ratesDb'

/**
 * Freelance jobs: side work that is paid like an invoice but is NOT company business. No number, never part of the company's
 * dashboard, reports or goals (they live in their own table). One-off or repeating (the cron makes the next one when it is due).
 */
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const NONE = '000000000000000000000000'
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
export const UNITS = ['day', 'week', 'month', 'year']

async function access(session) {
    const authority = session.user.authority || []
    return { scope: viewScope(authority, 'freelancers'), staffId: await getStaffId(session), can: (cap) => hasCap(authority, 'freelancers', cap) }
}
const visible = (a) => (a.scope === 'all' ? {} : a.staffId ? { addedFrom: a.staffId } : { id: NONE })

async function lookups() {
    const currencies = await prisma.crmCurrency.findMany()
    const modes = await prisma.crmPaymentMode.findMany({ orderBy: { name: 'asc' } })
    return {
        currencies: currencies.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, placement: c.placement, isDefault: !!c.isDefault })),
        paymentModes: modes.map((m) => ({ id: m.id, name: m.name })),
    }
}

export async function listFreelance(q = {}) {
    const session = await requirePermission('freelancers', 'view')
    const a = await access(session)
    const and = [visible(a)]
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    if (q.state === 'unpaid') and.push({ status: 'unpaid' })
    else if (q.state === 'paid') and.push({ status: 'paid' })
    else if (q.state === 'overdue') and.push({ status: 'unpaid', date: { lt: today } })
    else if (q.state === 'recurring') and.push({ recurring: true })
    if (oid(q.clientId)) and.push({ clientId: q.clientId })
    if (q.from || q.to) and.push({ date: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(`${q.to}T23:59:59Z`) } : {}) } })
    if (q.query) { const c = { contains: q.query, mode: 'insensitive' }; and.push({ OR: [{ title: c }, { payerName: c }, { description: c }] }) }
    const where = { AND: and }
    const page = Math.max(parseInt(q.pageIndex, 10) || 1, 1), size = Math.min(Math.max(parseInt(q.pageSize, 10) || 20, 5), 100)
    const dir = q.order === 'asc' ? 'asc' : 'desc'
    const orderBy = q.sortKey === 'amount' ? { amount: dir } : q.sortKey === 'title' ? { title: dir } : { date: dir }
    const [rows, total, all, lk, rt] = await Promise.all([
        prisma.crmFreelanceJob.findMany({ where, orderBy, skip: (page - 1) * size, take: size }),
        prisma.crmFreelanceJob.count({ where }),
        prisma.crmFreelanceJob.findMany({ where, select: { amount: true, currencyId: true, status: true, date: true, recurring: true } }),
        lookups(), loadRates(),
    ])
    const clients = await prisma.crmClient.findMany({ where: { id: { in: rows.map((r) => r.clientId).filter(Boolean) } }, select: { id: true, company: true } })
    const cMap = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    // the totals are in the base currency (each job converted with the rate saved on its currency; one without a rate is left out)
    const stats = { unpaid: 0, paid: 0, overdue: 0, overdueCount: 0, unpaidCount: 0, paidCount: 0, recurring: 0, count: all.length }
    for (const j of all) {
        if (j.recurring) stats.recurring += 1
        const k = toBase(1, j.currencyId, rt)
        const v = k === null ? 0 : j.amount * k
        if (j.status === 'paid') { stats.paid = round2(stats.paid + v); stats.paidCount += 1 } else {
            stats.unpaid = round2(stats.unpaid + v); stats.unpaidCount += 1
            if (j.date && new Date(j.date) < today) { stats.overdue = round2(stats.overdue + v); stats.overdueCount += 1 }
        }
    }
    return {
        list: rows.map((j) => ({ id: j.id, title: j.title, payerName: j.payerName, client: j.clientId ? { id: j.clientId, name: cMap[j.clientId] || '' } : null, amount: j.amount, currencyId: j.currencyId, date: j.date, status: j.status, paidDate: j.paidDate, overdue: j.status === 'unpaid' && !!j.date && new Date(j.date) < today, recurring: j.recurring, repeated: !!j.recurringFrom, repeatEvery: j.repeatEvery, recurringType: j.recurringType, description: j.description })),
        total, pageIndex: page, pageSize: size, stats: { ...stats, ratesMissing: rt.missing }, lookups: lk,
        can: { create: a.can('create'), edit: a.can('edit'), delete: a.can('delete') },
    }
}

async function loadOne(id, a) {
    if (!oid(id)) throw fail('Job not found', 404)
    const j = await prisma.crmFreelanceJob.findFirst({ where: { AND: [{ id }, visible(a)] } })
    if (!j) throw fail('Job not found', 404)
    return j
}

export async function getFreelance(id) {
    const session = await requirePermission('freelancers', 'view')
    const a = await access(session)
    const j = await loadOne(id, a)
    return {
        job: { id: j.id, title: j.title, payerName: j.payerName || '', clientId: j.clientId, description: j.description || '', amount: j.amount, currencyId: j.currencyId, date: j.date, status: j.status, paidDate: j.paidDate, paymentModeId: j.paymentModeId, recurring: j.recurring, repeatEvery: j.repeatEvery || 1, recurringType: j.recurringType || 'month', cyclesLimit: j.cycles || 0, cyclesDone: j.totalCycles || 0, lastRecurringDate: j.lastRecurringDate, repeated: !!j.recurringFrom },
        lookups: await lookups(), can: { edit: a.can('edit'), delete: a.can('delete') },
    }
}

export async function saveFreelance(body, id) {
    const session = await requirePermission('freelancers', id ? 'edit' : 'create')
    const a = await access(session)
    const title = nz(body.title)
    if (!title) throw fail('Name the job')
    const amount = Number(body.amount)
    if (!(amount > 0)) throw fail('Enter the amount')
    if (!body.date) throw fail('Choose the date the money is due')
    const recurring = !!body.recurring
    const data = {
        title, payerName: nz(body.payerName), clientId: oid(body.clientId), description: nz(body.description), amount: round2(amount), currencyId: oid(body.currencyId), date: new Date(body.date), paymentModeId: oid(body.paymentModeId),
        recurring, recurringType: recurring ? (UNITS.includes(body.recurringType) ? body.recurringType : 'month') : null, repeatEvery: recurring ? Math.max(parseInt(body.repeatEvery, 10) || 1, 1) : 0, cycles: recurring ? Math.max(parseInt(body.cyclesLimit, 10) || 0, 0) : 0,
    }
    if (id) {
        await loadOne(id, a)
        await prisma.crmFreelanceJob.update({ where: { id }, data })
        return { success: true, id }
    }
    const j = await prisma.crmFreelanceJob.create({ data: { ...data, status: 'unpaid', addedFrom: a.staffId } })
    return { success: true, id: j.id }
}

export async function setFreelanceState(id, action, paidDate) {
    const session = await requirePermission('freelancers', 'edit')
    const a = await access(session)
    await loadOne(id, a)
    if (action === 'markPaid') await prisma.crmFreelanceJob.update({ where: { id }, data: { status: 'paid', paidDate: paidDate ? new Date(paidDate) : new Date() } })
    else if (action === 'markUnpaid') await prisma.crmFreelanceJob.update({ where: { id }, data: { status: 'unpaid', paidDate: null } })
    else throw fail('Unknown action')
    return { success: true }
}

export async function deleteFreelance(id) {
    const session = await requirePermission('freelancers', 'delete')
    const a = await access(session)
    const j = await loadOne(id, a)
    // the copies of a repeating job stay (they are money that was due); only the schedule goes
    await prisma.crmFreelanceJob.updateMany({ where: { recurringFrom: j.id }, data: { recurringFrom: null } })
    await prisma.crmFreelanceJob.delete({ where: { id } })
    return { success: true }
}
