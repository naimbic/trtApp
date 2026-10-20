import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { isCrmAdmin } from '@/lib/crm/permissions'
import { KINDS, monthOf, lastMonths, monthsOfYear, dueFor, monthStatus, toBase } from '@/lib/crm/payrollCalc'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })

/** Payroll is for super administrators only. */
async function requireAdmin() {
    const session = await auth()
    if (!session?.user?.id) throw httpError('Unauthorized', 401)
    if (!isCrmAdmin(session.user.authority || [])) throw httpError('Only a super administrator can see payroll', 403)
    return session
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const rateMap = async () => {
    const cur = await prisma.crmCurrency.findMany({ select: { id: true, isDefault: true, rate: true } })
    const base = cur.find((c) => c.isDefault)
    return { rates: Object.fromEntries(cur.map((c) => [c.id, c.isDefault ? 1 : c.rate || 1])), baseId: base?.id || null }
}
const shapePayment = (p) => ({ id: p.id, staffId: p.staffId, month: p.month, amount: p.amount, currencyId: p.currencyId || null, paidDate: p.paidDate, kind: p.kind, method: p.method || '', note: p.note || '' })
// salary and advances pay the salary of a month; a bonus or other payment is an extra cost
const paysSalary = (p) => p.kind === 'salary' || p.kind === 'advance'

/** One member: their salary, the last 12 months (due / paid / status) and every payment. */
export async function getPayroll(staffId) {
    await requireAdmin()
    const staff = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { id: true, salary: true, salaryCurrencyId: true, payDay: true, salaryStart: true } })
    if (!staff) throw httpError('Member not found', 404)
    const payments = await prisma.crmStaffPayment.findMany({ where: { staffId }, orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }], take: 500 })
    const now = monthOf(new Date())
    const months = lastMonths(12).map((m) => {
        const of = payments.filter((p) => p.month === m)
        const due = dueFor(m, staff.salary || 0, staff.salaryStart)
        const paid = of.filter(paysSalary).reduce((n, p) => n + p.amount, 0)
        const extra = of.filter((p) => !paysSalary(p)).reduce((n, p) => n + p.amount, 0)
        return { month: m, due, paid, extra, status: monthStatus(due, paid, m, now) }
    })
    return { salary: { amount: staff.salary || 0, currencyId: staff.salaryCurrencyId || null, payDay: staff.payDay || null, start: staff.salaryStart || '' }, months, payments: payments.map(shapePayment), current: now }
}

export async function saveSalary(staffId, body) {
    await requireAdmin()
    const amount = body.amount === '' || body.amount === null || body.amount === undefined ? null : Number(body.amount)
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw httpError('The salary must be a positive number')
    const payDay = body.payDay === '' || body.payDay === null || body.payDay === undefined ? null : Math.round(Number(body.payDay))
    if (payDay !== null && (!(payDay >= 1 && payDay <= 31))) throw httpError('The pay day is a day of the month, 1 to 31')
    const start = body.start ? String(body.start) : null
    if (start && !MONTH.test(start)) throw httpError('The first month must look like 2026-04')
    await prisma.crmStaff.update({ where: { id: staffId }, data: { salary: amount, salaryCurrencyId: body.currencyId || null, payDay, salaryStart: start } })
    return getPayroll(staffId)
}

function cleanPayment(body) {
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw httpError('Enter the amount paid')
    if (!MONTH.test(String(body.month || ''))) throw httpError('Choose the month it is for')
    const kind = KINDS.includes(body.kind) ? body.kind : 'salary'
    const paidDate = body.paidDate ? new Date(body.paidDate) : new Date()
    if (Number.isNaN(+paidDate)) throw httpError('The payment date is not valid')
    return { amount, month: body.month, kind, paidDate, currencyId: body.currencyId || null, method: String(body.method || '').slice(0, 80) || null, note: String(body.note || '').slice(0, 500) || null }
}

export async function addPayment(body) {
    await requireAdmin()
    if (!body.staffId || !(await prisma.crmStaff.findUnique({ where: { id: body.staffId }, select: { id: true } }))) throw httpError('Member not found', 404)
    const row = await prisma.crmStaffPayment.create({ data: { staffId: body.staffId, ...cleanPayment(body) } })
    return shapePayment(row)
}

export async function updatePayment(id, body) {
    await requireAdmin()
    const row = await prisma.crmStaffPayment.update({ where: { id }, data: cleanPayment(body) }).catch(() => null)
    if (!row) throw httpError('Payment not found', 404)
    return shapePayment(row)
}

export async function deletePayment(id) {
    await requireAdmin()
    await prisma.crmStaffPayment.delete({ where: { id } }).catch(() => { throw httpError('Payment not found', 404) })
    return { success: true }
}

/** The whole team's payroll for a year, in the base currency: cost per month, and each member's current month. */
export async function payrollOverview(yearParam) {
    await requireAdmin()
    const now = new Date()
    const year = /^\d{4}$/.test(String(yearParam || '')) ? Number(yearParam) : now.getFullYear()
    const current = monthOf(now)
    const { rates, baseId } = await rateMap()
    const conv = (amount, currencyId) => toBase(amount, currencyId ? rates[currencyId] : 1)
    const [staff, payments] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true, jobTitle: true, salary: true, salaryCurrencyId: true, salaryStart: true, payDay: true } }),
        prisma.crmStaffPayment.findMany({ where: { month: { startsWith: `${year}-` } } }),
    ])
    const months = monthsOfYear(year)
    const byMonth = Object.fromEntries(months.map((m) => [m, { month: m, paid: 0, expected: 0 }]))
    for (const p of payments) if (byMonth[p.month]) byMonth[p.month].paid += conv(p.amount, p.currencyId)
    for (const s of staff) for (const m of months) if (m <= current || year < now.getFullYear()) byMonth[m].expected += conv(dueFor(m, s.salary || 0, s.salaryStart), s.salaryCurrencyId)
    const members = staff.map((s) => {
        const mine = payments.filter((p) => p.staffId === s.id)
        const due = dueFor(current, s.salary || 0, s.salaryStart)
        const paid = mine.filter((p) => p.month === current && paysSalary(p)).reduce((n, p) => n + p.amount, 0)
        return {
            id: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email, jobTitle: s.jobTitle || '', image: s.profileImage || null,
            salary: s.salary || 0, currencyId: s.salaryCurrencyId || null, payDay: s.payDay || null,
            thisMonth: { due, paid, status: monthStatus(due, paid, current, current) },
            yearPaid: mine.reduce((n, p) => n + conv(p.amount, p.currencyId), 0),
        }
    }).sort((a, b) => b.yearPaid - a.yearPaid || b.salary - a.salary)
    const cur = byMonth[current]
    return {
        year, current, baseCurrencyId: baseId,
        months: months.map((m) => ({ ...byMonth[m], paid: Math.round(byMonth[m].paid * 100) / 100, expected: Math.round(byMonth[m].expected * 100) / 100 })),
        members,
        totals: {
            monthlyPayroll: Math.round(staff.reduce((n, s) => n + conv(dueFor(current, s.salary || 0, s.salaryStart), s.salaryCurrencyId), 0) * 100) / 100,
            paidThisMonth: Math.round((cur?.paid || 0) * 100) / 100,
            yearPaid: Math.round(Object.values(byMonth).reduce((n, m) => n + m.paid, 0) * 100) / 100,
            late: members.filter((m) => m.thisMonth.status === 'late' || m.thisMonth.status === 'partial').length,
        },
    }
}
