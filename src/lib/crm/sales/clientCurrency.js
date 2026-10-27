import prisma from '@/lib/prisma'

/** The currency set on a client (Client → default currency): what a new document for it uses when none is chosen. */
export async function clientCurrency(clientId) {
    if (!/^[0-9a-f]{24}$/i.test(String(clientId || ''))) return null
    return (await prisma.crmClient.findUnique({ where: { id: String(clientId) }, select: { defaultCurrencyId: true } }))?.defaultCurrencyId || null
}
