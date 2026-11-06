import fs from 'node:fs'
import path from 'node:path'

export const E2E = { email: 'zz.e2e@test.local', password: 'ZzE2e-12345!', tag: 'zz e2e' }

/** Loads .env, and refuses to go on unless the database is on this computer. */
export function localEnv() {
    const file = path.resolve('.env')
    if (fs.existsSync(file)) for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
    const url = process.env.DATABASE_URL || ''
    if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error(`The browser tests only run on a local database (DATABASE_URL is "${url.replace(/\/\/.*@/, '//***@').slice(0, 40)}…")`)
}

/** Removes everything the browser tests made (by the "zz e2e" name) and the throw-away administrator. */
export async function cleanup(p) {
    const like = { startsWith: E2E.tag }
    const staff = await p.crmStaff.findFirst({ where: { email: E2E.email } })
    const leads = await p.crmLead.findMany({ where: { name: like }, select: { id: true } })
    const clients = await p.crmClient.findMany({ where: { company: like }, select: { id: true } })
    // a converted lead keeps the client's name in its company: take those too
    const more = await p.crmLead.findMany({ where: { company: like }, select: { id: true } })
    const leadIds = [...new Set([...leads, ...more].map((l) => l.id))]
    const clientIds = clients.map((c) => c.id)
    await p.crmLeadActivityLog.deleteMany({ where: { leadId: { in: leadIds } } })
    await p.crmNote.deleteMany({ where: { relType: 'lead', relId: { in: leadIds } } }).catch(() => {})
    await p.crmEvent.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
    await p.crmLead.deleteMany({ where: { id: { in: leadIds } } })
    await p.crmContact.deleteMany({ where: { clientId: { in: clientIds } } }).catch(() => {})
    await p.crmClient.deleteMany({ where: { id: { in: clientIds } } })
    await p.crmTask.deleteMany({ where: { name: like } })
    await p.crmLeadSource.deleteMany({ where: { name: like } })
    if (staff) {
        await p.crmSavedView.deleteMany({ where: { ownerId: staff.id } })
        await p.crmNotification.deleteMany({ where: { toUserId: staff.id } })
        await p.crmNotifState.deleteMany({ where: { staffId: staff.id } })
        await p.crmReminder.deleteMany({ where: { staffId: staff.id } })
    }
    await p.crmStaff.deleteMany({ where: { email: E2E.email } })
    await p.user.deleteMany({ where: { email: E2E.email } })
}
