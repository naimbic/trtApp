import prisma from '@/lib/prisma'
import { chooseBank, bankTokens } from '@/lib/crm/bank'

/** A payment method that carries bank details is a bank account (Payment methods page; the former Bank accounts kept their ids). */
export const isBankMode = (m) => !!(m.rib || m.bank || m.holder || m.swift)

/** The bank accounts: the payment methods with bank details. */
export async function bankAccounts() {
    let modes = await prisma.crmPaymentMode.findMany()
    // an old bank account that did not make it into the list (the merge of Bank accounts into Payment methods runs when the server starts) joins it now, with the same id
    const old = await prisma.crmBankAccount.findMany().catch(() => [])
    const missing = old.filter((b) => !modes.some((m) => m.id === b.id))
    if (missing.length) {
        const last = modes.reduce((n, m) => Math.max(n, m.sortOrder || 0), 0)
        for (const [i, b] of missing.entries()) await prisma.crmPaymentMode.create({ data: { id: b.id, name: b.name, bank: b.bank, holder: b.holder, rib: b.rib, swift: b.swift, isDefault: !!b.isDefault, active: b.active !== false, sortOrder: last + i + 1, showOnPdf: false, invoicesOnly: false, expensesOnly: false, selectedByDefault: false } }).catch(() => {})
        modes = await prisma.crmPaymentMode.findMany()
    }
    return modes.filter(isBankMode)
}

/** The bank terms for one document: { company_bank, company_rib, company_swift, company_bank_holder }, or null to keep the company options. */
export async function bankTokensFor({ docAccountId, clientId, currencyId } = {}) {
    const accounts = await bankAccounts()
    if (!accounts.length) return null
    let clientAccountId = null
    if (clientId) clientAccountId = (await prisma.crmClient.findUnique({ where: { id: clientId }, select: { bankAccountId: true } }))?.bankAccountId || null
    return bankTokens(chooseBank({ docAccountId, clientAccountId, currencyId, accounts }))
}
