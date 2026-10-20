import prisma from '@/lib/prisma'
import { requirePermission, hasCap } from '@/lib/crm/permissions'
import { loadRates } from '@/lib/crm/ratesDb'
import { toBase } from '@/lib/crm/rates'
import { periodRange, goalStanding, kindOf, isLegacyGoal, parseSteps, stepsState } from '@/lib/crm/goalsCalc'

const staffName = (s) => `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || s?.email || ''
const round2 = (n) => Math.round(n * 100) / 100

/** The measured value of one goal over [start, end]: money in the base currency, or a count. */
async function measure(goal, { start, end }, rt, flags) {
    const range = { gte: start, lte: end }
    const staffId = goal.staffId || null
    const money = (amount, currencyId) => { const v = toBase(amount, currencyId, rt); if (v === null) { flags.ratesMissing = true; return 0 } return v }
    const mine = (a, b) => ({ OR: [{ [a]: staffId }, ...(b ? [{ [b]: staffId }] : [])] })
    switch (goal.kind) {
        case 'income':
        case 'profit': {
            const pays = await prisma.crmPayment.findMany({ where: { paymentDate: range }, select: { amount: true, invoice: { select: { currencyId: true, addedFrom: true, saleAgentId: true } } } })
            const income = pays.filter((p) => !staffId || p.invoice?.addedFrom === staffId || p.invoice?.saleAgentId === staffId).reduce((n, p) => n + money(p.amount, p.invoice?.currencyId), 0)
            if (goal.kind === 'income') return round2(income)
            const exp = await prisma.crmExpense.findMany({ where: { date: range }, select: { amount: true, currencyId: true } })
            return round2(income - exp.reduce((n, e) => n + money(e.amount, e.currencyId), 0))
        }
        case 'invoiced': {
            const inv = await prisma.crmInvoice.findMany({ where: { date: range, status: { notIn: [5, 6] }, ...(staffId ? mine('addedFrom', 'saleAgentId') : {}) }, select: { total: true, currencyId: true } })
            return round2(inv.reduce((n, i) => n + money(i.total, i.currencyId), 0))
        }
        case 'customers': return prisma.crmClient.count({ where: { createdAt: range } })
        case 'leads': return prisma.crmLead.count({ where: { createdAt: range, ...(staffId ? { OR: [{ assigned: staffId }, { assignedIds: { has: staffId } }, { addedFrom: staffId }] } : {}) } })
        case 'converted': return prisma.crmLead.count({ where: { dateConverted: range, clientId: { not: null }, ...(staffId ? { OR: [{ assigned: staffId }, { assignedIds: { has: staffId } }, { addedFrom: staffId }] } : {}) } })
        case 'contracts': return prisma.crmContract.count({ where: { dateStart: range, trash: false } })
        case 'tasks': {
            if (!staffId) return prisma.crmTask.count({ where: { status: 5, dateFinished: range } })
            const done = await prisma.crmTask.findMany({ where: { status: 5, dateFinished: range }, select: { id: true } })
            return done.length ? prisma.crmTaskAssigned.count({ where: { staffId, taskId: { in: done.map((t) => t.id) } } }) : 0
        }
        default: return 0
    }
}

/** Every goal with where it stands today: [{ ..., current, pct, status, daysLeft, remaining, perDay }]. */
export async function getGoalsBoard() {
    const session = await requirePermission('goals', 'view')
    const authority = session.user.authority || []
    const [rows, rt] = await Promise.all([prisma.crmGoal.findMany({ orderBy: [{ endDate: 'desc' }, { createdAt: 'desc' }], take: 300 }), loadRates()])
    const staff = await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(rows.map((g) => g.staffId).filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true, email: true } })
    const sMap = Object.fromEntries(staff.map((s) => [s.id, staffName(s)]))
    const flags = { ratesMissing: false }
    const now = new Date()
    const goals = []
    for (const g of rows) {
        const k = kindOf(g.kind)
        const range = periodRange(g.period || 'fixed', now, g.startDate, g.endDate)
        const legacy = isLegacyGoal(g)
        const current = legacy ? 0 : await measure(g, range, rt, flags)
        const standing = legacy ? { pct: 0, status: 'legacy', expected: 0, daysLeft: 0, remaining: 0, perDay: 0 } : goalStanding({ current, target: g.achievement, start: range.start, end: range.end, now })
        goals.push({
            id: g.id, subject: g.subject, description: g.description || '', kind: g.kind || null, kindLabel: k?.label || null, unit: k?.unit || 'count', staffOk: !!k?.staff,
            target: g.achievement || 0, period: g.period || 'fixed', startDate: range.start, endDate: range.end, staffId: g.staffId || null, staff: g.staffId ? sMap[g.staffId] || '' : null,
            current, legacy, ...standing, steps: stepsState(parseSteps(g.stepsRaw), current),
        })
    }
    return { goals, baseCurrencyId: rt.baseId, ratesMissing: flags.ratesMissing, can: { create: hasCap(authority, 'goals', 'create'), edit: hasCap(authority, 'goals', 'edit'), delete: hasCap(authority, 'goals', 'delete') } }
}
