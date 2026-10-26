import prisma from '@/lib/prisma'

/**
 * Freelance / personal clients (CrmClient.incomeExcluded): active clients whose work is not company business. They never get a
 * company-numbered document and nothing of theirs counts in income, the dashboard, reports or goals.
 */
export const EXCLUDED_MESSAGE = 'This client is a freelance / personal client: it is excluded from invoices, estimates, proposals and purchase orders (untick it on the client page to bill them)'

export async function excludedClientIds() {
    const rows = await prisma.crmClient.findMany({ where: { incomeExcluded: true }, select: { id: true } })
    return rows.map((r) => r.id)
}

export async function isIncomeExcluded(clientId) {
    if (!clientId || !/^[0-9a-f]{24}$/i.test(String(clientId))) return false
    const c = await prisma.crmClient.findUnique({ where: { id: String(clientId) }, select: { incomeExcluded: true } })
    return !!c?.incomeExcluded
}

/** A Prisma `where` piece that leaves the excluded clients' rows out (an invoice, estimate... has a clientId). */
export async function notExcluded(field = 'clientId') {
    const ids = await excludedClientIds()
    return ids.length ? { [field]: { notIn: ids } } : {}
}

/** The same for payments: a payment belongs to an invoice, and the invoice to a client. */
export async function notExcludedPayments() {
    const ids = await excludedClientIds()
    return ids.length ? { invoice: { is: { clientId: { notIn: ids } } } } : {}
}
