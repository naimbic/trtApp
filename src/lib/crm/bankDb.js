import prisma from '@/lib/prisma'
import { chooseBank, bankTokens } from '@/lib/crm/bank'

/** A payment method that carries bank details is a bank account (Payment methods page; the former Bank accounts kept their ids). */
export const isBankMode = (m) => !!(m.rib || m.bank || m.holder || m.swift)

/** The bank accounts: the payment methods with bank details. */
export async function bankAccounts() {
    return (await prisma.crmPaymentMode.findMany()).filter(isBankMode)
}

/** The bank terms for one document: { company_bank, company_rib, company_swift, company_bank_holder }, or null to keep the company options. */
export async function bankTokensFor({ docAccountId, clientId, currencyId } = {}) {
    const accounts = await bankAccounts()
    if (!accounts.length) return null
    let clientAccountId = null
    if (clientId) clientAccountId = (await prisma.crmClient.findUnique({ where: { id: clientId }, select: { bankAccountId: true } }))?.bankAccountId || null
    return bankTokens(chooseBank({ docAccountId, clientAccountId, currencyId, accounts }))
}
