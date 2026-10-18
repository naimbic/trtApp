import prisma from '@/lib/prisma'
import { ratesOf } from '@/lib/crm/rates'

/** The base currency and the rate of every other one, read from the Currencies setup. */
export async function loadRates() {
    return ratesOf(await prisma.crmCurrency.findMany({ select: { id: true, name: true, isDefault: true, rate: true } }))
}
