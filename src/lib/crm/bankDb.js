import prisma from '@/lib/prisma'
import { chooseBank, bankTokens } from '@/lib/crm/bank'

/** The bank terms for one document: { company_bank, company_rib, company_swift, company_bank_holder }, or null to keep the company options. */
export async function bankTokensFor({ docAccountId, clientId } = {}) {
    const accounts = await prisma.crmBankAccount.findMany()
    if (!accounts.length) return null
    let clientAccountId = null
    if (clientId) clientAccountId = (await prisma.crmClient.findUnique({ where: { id: clientId }, select: { bankAccountId: true } }))?.bankAccountId || null
    return bankTokens(chooseBank({ docAccountId, clientAccountId, accounts }))
}
