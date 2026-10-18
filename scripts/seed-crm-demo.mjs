// Demo data for the CRM dashboard: clients, leads, projects, tasks, tickets, invoices (+payments), expenses.
// Safe to run once (guarded by the `demo_crm_seeded` option). Run: node scripts/seed-crm-demo.mjs [--force] [--years 3]
// --years N spreads the history over N years instead of one (clients, leads, projects, tasks, tickets, invoices, expenses).
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const force = process.argv.includes('--force')
const yi = process.argv.indexOf('--years')
const Y = Math.min(5, Math.max(1, Number(yi > -1 ? process.argv[yi + 1] : 1) || 1))
if (!force && (await prisma.crmOption.findUnique({ where: { name: 'demo_crm_seeded' } }))) {
    console.log('Demo CRM data already seeded (use --force to add again).')
    process.exit(0)
}

let seed = 42
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const between = (a, b) => Math.round(a + rnd() * (b - a))
const daysAgo = (n) => new Date(Date.now() - n * 86400000)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const money = (n) => Math.round(n * 100) / 100

const mad = (await prisma.crmCurrency.findFirst({ where: { isDefault: true } })) || (await prisma.crmCurrency.create({ data: { name: 'MAD', symbol: 'MAD', placement: 'after', isDefault: true } }))
const eur = (await prisma.crmCurrency.findFirst({ where: { name: 'EUR' } })) || (await prisma.crmCurrency.create({ data: { name: 'EUR', symbol: '€', placement: 'before' } }))
const tva = (await prisma.crmTax.findFirst({ where: { taxRate: 20 } })) || (await prisma.crmTax.create({ data: { name: 'TVA', taxRate: 20 } }))
const modes = await prisma.crmPaymentMode.findMany()
const mode = modes.length ? modes : [await prisma.crmPaymentMode.create({ data: { name: 'Bank transfer', active: true } })]

// ---- clients
const companies = ['Atlas Digital', 'Maroc Telecom Pro', 'Casablanca Logistics', 'Rabat Consulting', 'Marrakech Hospitality', 'Tanger Freight', 'Agadir Solar', 'Fès Artisans', 'Oujda Foods', 'Kenitra Auto', 'Tétouan Textiles', 'Meknès Agro', 'Safi Marine', 'Nador Retail', 'El Jadida Tech']
const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Agadir', 'Fès']
const clients = []
for (const [i, company] of companies.entries()) {
    clients.push(await prisma.crmClient.create({ data: { company, city: pick(cities), active: rnd() > 0.15, phoneNumber: `+2126${between(10000000, 99999999)}`, createdAt: daysAgo(between(5, 340 * Y)) } }))
    await prisma.crmContact.create({ data: { clientId: clients[i].id, isPrimary: true, firstName: pick(['Youssef', 'Salma', 'Omar', 'Imane', 'Hamza', 'Nadia']), lastName: pick(['Benali', 'El Idrissi', 'Tazi', 'Alaoui', 'Chraibi']), email: `contact${i + 1}@example.ma`, active: true } })
}

// ---- leads
const statusNames = ['New', 'Contacted', 'Qualified', 'Proposal sent', 'Negotiation']
const statuses = []
for (const [i, name] of statusNames.entries()) statuses.push((await prisma.crmLeadStatus.findFirst({ where: { name } })) || (await prisma.crmLeadStatus.create({ data: { name, statusOrder: i + 1, color: ['#2a85ff', '#8C62FF', '#00C7BE', '#fbc13e', '#ff6a55'][i] } })))
const sources = []
for (const name of ['Website', 'Referral', 'LinkedIn', 'Trade show']) sources.push((await prisma.crmLeadSource.findFirst({ where: { name } })) || (await prisma.crmLeadSource.create({ data: { name } })))
for (let i = 0; i < 38; i++) {
    const converted = i < 5
    await prisma.crmLead.create({
        data: {
            name: `${pick(['Karim', 'Laila', 'Mehdi', 'Sara', 'Anass', 'Hind'])} ${pick(['Bennani', 'Lahlou', 'Amrani', 'Fassi', 'Ouazzani'])}`,
            company: `${pick(['Sahara', 'Atlas', 'Medina', 'Oasis', 'Rif'])} ${pick(['Group', 'Services', 'Industries', 'Studio'])}`,
            email: `lead${i}@example.ma`,
            statusId: pick(statuses).id,
            sourceId: pick(sources).id,
            lost: !converted && rnd() < 0.12,
            junk: !converted && rnd() < 0.05,
            clientId: converted ? clients[i].id : undefined,
            dateConverted: converted ? daysAgo(between(5, 90 * Y)) : undefined,
            createdAt: daysAgo(between(1, 200 * Y)),
        },
    })
}

// ---- projects & tasks
const projects = []
for (const [i, name] of ['Website redesign', 'ERP migration', 'Mobile app', 'SEO campaign', 'Brand identity', 'CRM rollout', 'Data warehouse', 'Solar dashboard'].entries()) {
    projects.push(await prisma.crmProject.create({ data: { name, status: [2, 2, 2, 1, 5, 3, 2, 5][i], clientId: clients[i].id, startDate: daysAgo(between(20, 200 * Y)), deadline: addDays(new Date(), between(-20, 90)) } }))
}
const taskNames = ['Kick-off meeting', 'Collect requirements', 'Wireframes', 'UI design', 'Backend API', 'Frontend build', 'QA testing', 'Client review', 'Deploy to staging', 'Launch', 'Documentation', 'Training session']
for (let i = 0; i < 60 * Y; i++) {
    const status = pick([1, 2, 3, 4, 4, 4, 5, 5, 5])
    await prisma.crmTask.create({
        data: {
            name: `${pick(taskNames)} #${i + 1}`,
            status,
            priority: pick([1, 2, 2, 3, 4]),
            startDate: daysAgo(between(1, 60)),
            dueDate: addDays(new Date(), between(-15, 25)),
            relType: 'project',
            relId: pick(projects).id,
            createdAt: daysAgo(between(1, 120 * Y)),
        },
    })
}

// ---- tickets
const tStatuses = []
for (const [i, name] of ['Open', 'In progress', 'Answered', 'On hold', 'Closed'].entries()) tStatuses.push((await prisma.crmTicketStatus.findFirst({ where: { name } })) || (await prisma.crmTicketStatus.create({ data: { name, statusOrder: i + 1, statusColor: ['#ff6a55', '#2a85ff', '#00C7BE', '#fbc13e', '#7cbc7d'][i] } })))
for (let i = 0; i < 24; i++) {
    await prisma.crmTicket.create({ data: { clientId: pick(clients).id, subject: pick(['Cannot log in', 'Invoice question', 'Feature request', 'Server is slow', 'Update billing details', 'Report a bug']), message: 'Demo ticket', statusId: pick(tStatuses).id, createdAt: daysAgo(between(1, 120 * Y)) } })
}

// ---- invoices + payments + expenses over the chosen span (default 12 months)
const catNames = ['Hosting', 'Software', 'Travel', 'Marketing']
const cats = []
for (const name of catNames) cats.push((await prisma.crmExpenseCategory.findFirst({ where: { name } })) || (await prisma.crmExpenseCategory.create({ data: { name } })))
const last = await prisma.crmInvoice.findFirst({ orderBy: { number: 'desc' }, select: { number: true } })
let number = (last?.number || 0) + 1
for (let i = 0; i < 70 * Y; i++) {
    const client = pick(clients)
    const currency = rnd() < 0.8 ? mad : eur
    const date = daysAgo(between(2, 350 * Y))
    const dueDate = addDays(date, 30)
    const lines = Array.from({ length: between(1, 3) }, () => ({ description: pick(['Consulting', 'Development', 'Design', 'Hosting plan', 'Maintenance', 'Training']), qty: between(1, 10), rate: currency === mad ? between(300, 2500) : between(40, 300) }))
    const subtotal = money(lines.reduce((s, l) => s + l.qty * l.rate, 0))
    const totalTax = money(subtotal * 0.2)
    const total = money(subtotal + totalTax)
    const outcome = rnd()
    const paid = outcome < 0.6 ? total : outcome < 0.78 ? money(total * (0.3 + rnd() * 0.4)) : 0
    const overdue = dueDate < new Date()
    const status = paid >= total ? 2 : paid > 0 ? (overdue ? 4 : 3) : overdue ? 4 : 1
    const inv = await prisma.crmInvoice.create({
        data: { clientId: client.id, number: number++, prefix: 'INV-', numberFormat: 1, date, dueDate, currencyId: currency.id, subtotal, totalTax, total, status, sent: true, createdAt: date },
    })
    for (const [idx, l] of lines.entries()) {
        const it = await prisma.crmItemable.create({ data: { relType: 'invoice', relId: inv.id, description: l.description, qty: l.qty, rate: l.rate, itemOrder: idx + 1 } })
        await prisma.crmItemTax.create({ data: { itemableId: it.id, relType: 'invoice', relId: inv.id, taxName: tva.name, taxRate: tva.taxRate } })
    }
    if (paid > 0) {
        const parts = paid === total && rnd() < 0.3 ? 2 : 1
        for (let p = 0; p < parts; p++) {
            const amount = parts === 1 ? paid : p === 0 ? money(paid * 0.5) : money(paid - money(paid * 0.5))
            const when = addDays(date, between(3, 40 + p * 20))
            await prisma.crmPayment.create({ data: { invoiceId: inv.id, amount, paymentModeId: pick(mode).id, paymentDate: when > new Date() ? new Date() : when } })
        }
    }
    await prisma.crmSalesActivity.create({ data: { relType: 'invoice', relId: inv.id, description: 'Invoice created', date } })
}
await prisma.crmOption.upsert({ where: { name: 'next_invoice_number' }, update: { value: String(number) }, create: { name: 'next_invoice_number', value: String(number) } })
for (let i = 0; i < 60 * Y; i++) {
    const currency = rnd() < 0.85 ? mad : eur
    await prisma.crmExpense.create({ data: { expenseName: pick(['Server costs', 'Adobe licence', 'Train ticket', 'Google Ads', 'Domain renewal', 'Office supplies']), categoryId: pick(cats).id, currencyId: currency.id, amount: currency === mad ? between(150, 4000) : between(20, 400), date: daysAgo(between(1, 350 * Y)), billable: rnd() < 0.2 } })
}

await prisma.crmOption.upsert({ where: { name: 'demo_crm_seeded' }, update: { value: new Date().toISOString() }, create: { name: 'demo_crm_seeded', value: new Date().toISOString() } })
console.log('Demo CRM data created.')
await prisma.$disconnect()
