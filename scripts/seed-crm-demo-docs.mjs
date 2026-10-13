// Demo estimates and proposals for the dashboard overview boxes. Run once: node scripts/seed-crm-demo-docs.mjs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
if (await prisma.crmOption.findUnique({ where: { name: 'demo_crm_docs_seeded' } })) {
    console.log('Already seeded.')
    process.exit(0)
}
const clients = await prisma.crmClient.findMany({ take: 15 })
const mad = await prisma.crmCurrency.findFirst({ where: { isDefault: true } })
const day = (n) => new Date(Date.now() - n * 86400000)
const estStatus = [1, 1, 2, 2, 2, 2, 3, 4, 4, 4, 4, 5]
for (const [i, status] of estStatus.entries()) {
    const subtotal = 2000 + i * 750
    await prisma.crmEstimate.create({ data: { clientId: clients[i % clients.length].id, number: i + 1, prefix: 'EST-', date: day(10 + i * 9), expiryDate: day(-20 + i * 9), currencyId: mad?.id, subtotal, totalTax: subtotal * 0.2, total: subtotal * 1.2, status, sent: status > 1 } })
}
const propStatus = [6, 6, 4, 4, 1, 1, 5, 2, 3, 3, 3]
for (const [i, status] of propStatus.entries()) {
    const total = 3000 + i * 900
    await prisma.crmProposal.create({ data: { subject: `Proposal ${i + 1} — ${['Website', 'App', 'SEO', 'Branding'][i % 4]}`, proposalTo: clients[i % clients.length].company, date: day(5 + i * 12), currencyId: mad?.id, subtotal: total, total, status } })
}
await prisma.crmOption.create({ data: { name: 'demo_crm_docs_seeded', value: new Date().toISOString() } })
console.log('Estimates and proposals created.')
await prisma.$disconnect()
