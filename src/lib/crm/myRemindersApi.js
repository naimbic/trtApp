import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
/** The records a person can set a reminder on (it is a private note to themselves, with a time). */
export const REMIND_TYPES = ['task', 'lead', 'customer', 'ticket', 'project', 'invoice', 'estimate', 'proposal', 'contract', 'expense', 'issue']

async function me() {
    const session = await requirePermission(null)
    const staffId = await getStaffId(session)
    if (!staffId) throw fail('Only a team member can set a reminder', 403)
    return staffId
}

/** My reminders on one record, soonest first. */
export async function listMine({ relType, relId } = {}) {
    const staffId = await me()
    if (!REMIND_TYPES.includes(relType) || !oid(relId)) throw fail('Unknown record')
    const rows = await prisma.crmReminder.findMany({ where: { staffId, relType, relId }, orderBy: { date: 'asc' }, take: 50 })
    return { list: rows.map((r) => ({ id: r.id, date: r.date, note: r.description || '', done: !!r.isNotified })) }
}

/** A reminder with a date AND a time, on a record: the bell, a push, an email and the chat apps tell the person when it comes (inside the notification hours). */
export async function addMine(body = {}) {
    const staffId = await me()
    if (!REMIND_TYPES.includes(body.relType) || !oid(body.relId)) throw fail('Unknown record')
    const date = new Date(body.date)
    if (Number.isNaN(+date)) throw fail('Choose a date and a time')
    if (+date < Date.now() - 60000) throw fail('Choose a date and a time in the future')
    const row = await prisma.crmReminder.create({ data: { relType: body.relType, relId: body.relId, staffId, creatorId: staffId, date, description: String(body.note || '').trim().slice(0, 500) || null, notifyByEmail: body.notifyByEmail !== false, isNotified: false } })
    return { id: row.id }
}

export async function removeMine(id) {
    const staffId = await me()
    const r = oid(id) && (await prisma.crmReminder.findFirst({ where: { id, staffId } }))
    if (!r) throw fail('Reminder not found', 404)
    await prisma.crmReminder.delete({ where: { id } })
    return { success: true }
}
