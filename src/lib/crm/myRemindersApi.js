import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
/** The records a person can set a reminder on (it is a private note to themselves, with a time). */
export const REMIND_TYPES = ['task', 'lead', 'customer', 'ticket', 'project', 'invoice', 'estimate', 'proposal', 'contract', 'expense', 'issue', 'kb_article']

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
    // who is told: the person themselves, or the colleagues chosen (the people assigned to the record, for example): one reminder each
    const wanted = [...new Set((Array.isArray(body.staffIds) ? body.staffIds : []).filter(oid))].slice(0, 20)
    const targets = wanted.length ? wanted : [staffId]
    const [valid, creator] = await Promise.all([
        prisma.crmStaff.findMany({ where: { id: { in: targets }, active: true }, select: { id: true } }),
        prisma.crmStaff.findUnique({ where: { id: staffId }, select: { firstName: true, lastName: true, email: true } }),
    ])
    if (!valid.length) throw fail('Choose who to remind')
    const by = [creator?.firstName, creator?.lastName].filter(Boolean).join(' ') || creator?.email || ''
    const note = String(body.note || '').trim()
    let first = null
    for (const t of valid) {
        const mine = t.id === staffId
        const description = (mine ? note : `${by}${note ? `: ${note}` : ''}`).slice(0, 500) || null
        const row = await prisma.crmReminder.create({ data: { relType: body.relType, relId: body.relId, staffId: t.id, creatorId: staffId, date, description, tab: /^[a-z]{3,12}$/.test(String(body.tab || '')) ? String(body.tab) : null, notifyByEmail: body.notifyByEmail !== false, isNotified: false } })
        if (mine || !first) first = row
    }
    return { id: first.id, count: valid.length }
}

export async function removeMine(id) {
    const staffId = await me()
    const r = oid(id) && (await prisma.crmReminder.findFirst({ where: { id, staffId } }))
    if (!r) throw fail('Reminder not found', 404)
    await prisma.crmReminder.delete({ where: { id } })
    return { success: true }
}
