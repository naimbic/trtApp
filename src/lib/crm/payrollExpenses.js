import prisma from '@/lib/prisma'

export const PAYROLL_CATEGORY = 'Payroll'
const KIND = { salary: 'Salary', advance: 'Advance', bonus: 'Bonus', other: 'Payment' }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthLabel = (m) => { const [y, n] = String(m).split('-'); return `${MONTHS[(+n || 1) - 1]} ${y}` }

/** Settings -> Sales -> General: record payroll payments as expenses. */
export const payrollToExpenses = async () => (await prisma.crmOption.findUnique({ where: { name: 'payroll_to_expenses' } }))?.value === '1'

async function categoryId() {
    const found = await prisma.crmExpenseCategory.findFirst({ where: { name: { equals: PAYROLL_CATEGORY, mode: 'insensitive' } } })
    return (found || await prisma.crmExpenseCategory.create({ data: { name: PAYROLL_CATEGORY, description: 'Salaries, advances and bonuses (created from Payroll)' } })).id
}

const fields = async (payment, defaultCurrencyId) => {
    const staff = await prisma.crmStaff.findUnique({ where: { id: payment.staffId }, select: { firstName: true, lastName: true, email: true } })
    const who = `${staff?.firstName || ''} ${staff?.lastName || ''}`.trim() || staff?.email || ''
    return {
        expenseName: `${KIND[payment.kind] || 'Payment'} - ${who} - ${monthLabel(payment.month)}`,
        amount: payment.amount,
        currencyId: payment.currencyId || defaultCurrencyId || null,
        date: payment.paidDate,
        note: payment.note || null,
        staffPaymentId: payment.id,
    }
}

/** Keeps the expense of a payment in step with it: updates it when it exists, creates it when the setting is on. */
export async function syncPaymentExpense(payment) {
    const [existing, on, cur] = await Promise.all([
        prisma.crmExpense.findFirst({ where: { staffPaymentId: payment.id }, select: { id: true } }),
        payrollToExpenses(),
        prisma.crmCurrency.findFirst({ where: { isDefault: true }, select: { id: true } }),
    ])
    if (!existing && !on) return null
    const data = await fields(payment, cur?.id)
    if (existing) return prisma.crmExpense.update({ where: { id: existing.id }, data })
    return prisma.crmExpense.create({ data: { ...data, categoryId: await categoryId() } })
}

export async function removePaymentExpense(paymentId) {
    await prisma.crmExpense.deleteMany({ where: { staffPaymentId: paymentId } })
}

/** One expense for every payment that has none yet. Returns how many were created. */
export async function createMissingExpenses() {
    const [payments, linked, cur] = await Promise.all([
        prisma.crmStaffPayment.findMany({}),
        prisma.crmExpense.findMany({ where: { staffPaymentId: { not: null } }, select: { staffPaymentId: true } }),
        prisma.crmCurrency.findFirst({ where: { isDefault: true }, select: { id: true } }),
    ])
    const done = new Set(linked.map((e) => e.staffPaymentId))
    const cat = await categoryId()
    let n = 0
    for (const p of payments) {
        if (done.has(p.id)) continue
        await prisma.crmExpense.create({ data: { ...(await fields(p, cur?.id)), categoryId: cat } })
        n++
    }
    return n
}
