import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { E2E, cleanup, localEnv } from './env.mjs'

export default async function setup() {
    localEnv()
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
        await p.crmNotification.create({ data: { toUserId: staff.id, fromFullName: 'Naim Admin', description: `${E2E.tag} please check the quote`, additionalData: 'mention', link: '/crm/notes', isRead: false } })
    } finally { await p.$disconnect() }
}
