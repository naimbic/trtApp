import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { E2E, cleanup, localEnv } from './env.mjs'

// compile the pages and routes the tests use before the first test, so a cold dev server does not time a test out
async function warmUp() {
    const urls = ['http://localhost:3200/sign-in', 'http://localhost:3200/crm/leads', 'http://localhost:3200/crm/tasks-board', 'http://localhost:3200/crm/lists', 'http://localhost:3200/crm/notifications', 'http://localhost:3200/api/crm/pipeline/leads', 'http://localhost:3200/api/crm/work/tasks', 'http://localhost:3200/api/crm/notifications', 'http://localhost:3200/api/crm/lead-sources', 'http://localhost:3200/api/crm/saved-views?page=leads', 'http://localhost:3200/api/crm/duplicates', 'http://localhost:3200/api/crm/pipeline/leads/bulk']
    await Promise.all(urls.map((u) => fetch(u).catch(() => {})))
}

export default async function setup() {
    localEnv()
    await warmUp()
    const p = new PrismaClient()
    try {
        await cleanup(p) // what a run that was stopped halfway left behind
        const hash = await bcrypt.hash(E2E.password, 10)
        const existing = await p.user.findFirst({ where: { email: E2E.email } })
        const data = { name: 'E2E Admin', email: E2E.email, password: hash, role: 'admin', authority: ['admin', 'user'], status: 'active' }
        const user = existing ? await p.user.update({ where: { id: existing.id }, data }) : await p.user.create({ data })
        if (!(await p.crmStaff.findFirst({ where: { email: E2E.email } }))) await p.crmStaff.create({ data: { userId: user.id, email: E2E.email, firstName: 'E2E', lastName: 'Admin', active: true, admin: true } })
        const staff = await p.crmStaff.findFirst({ where: { email: E2E.email } })
        // two leads to select, and a notification to read
        const status = await p.crmLeadStatus.findFirst({ orderBy: { statusOrder: 'asc' } })
        for (const n of ['A', 'B']) await p.crmLead.create({ data: { name: `${E2E.tag} lead ${n}`, company: `${E2E.tag} company ${n}`, statusId: status?.id, addedFrom: staff.id, assigned: staff.id, assignedIds: [staff.id] } })
        // an accepted estimate of a client, for the contract chain
        const client = await p.crmClient.create({ data: { company: `${E2E.tag} company C` } })
        const estimate = await p.crmEstimate.create({ data: { clientId: client.id, number: 987654, prefix: 'ZZ-', numberFormat: 1, date: new Date(), status: 4, total: 1000, adminNote: E2E.tag, hash: 'zze2e' } })
        process.env.E2E_ESTIMATE_ID = estimate.id // the tests read it
        await p.crmNotification.create({ data: { toUserId: staff.id, fromFullName: 'Naim Admin', description: `${E2E.tag} please check the quote`, additionalData: 'mention', link: '/crm/notes', isRead: false } })
    } finally { await p.$disconnect() }
}
