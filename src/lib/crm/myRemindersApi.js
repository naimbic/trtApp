import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { reminderLink } from '@/lib/crm/notifications'

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

/** All my reminders, with the record each is about (its name and where it opens). */
export async function listAllMine() {
    const staffId = await me()
    const rows = await prisma.crmReminder.findMany({ where: { staffId }, orderBy: { date: 'asc' }, take: 500 })
    const ids = (type) => [...new Set(rows.filter((r) => r.relType === type && r.relId).map((r) => r.relId))]
    const find = async (model, type, select) => { const list = ids(type); return list.length ? prisma[model].findMany({ where: { id: { in: list } }, select }) : [] }
    const [tasks, leads, clients, projects, tickets] = await Promise.all([
        find('crmTask', 'task', { id: true, name: true }), find('crmLead', 'lead', { id: true, name: true, company: true }), find('crmClient', 'customer', { id: true, company: true }),
        find('crmProject', 'project', { id: true, name: true }), find('crmTicket', 'ticket', { id: true, subject: true }),
    ])
    const label = {}
    for (const t of tasks) label[`task:${t.id}`] = t.name
    for (const l of leads) label[`lead:${l.id}`] = l.company || l.name
    for (const c of clients) label[`customer:${c.id}`] = c.company
    for (const p of projects) label[`project:${p.id}`] = p.name
    for (const t of tickets) label[`ticket:${t.id}`] = t.subject
    return {
        list: rows.map((r) => ({ id: r.id, date: r.date, note: r.description || '', done: !!r.isNotified, relType: r.relType || '', relLabel: label[`${r.relType}:${r.relId}`] || '', link: r.relType ? reminderLink(r) : null })),
    }
}

const LINK_TYPES = { tasks: 'task', 'tasks-board': 'task', leads: 'lead', clients: 'customer', tickets: 'ticket', projects: 'project', invoices: 'invoice', estimates: 'estimate', proposals: 'proposal', contracts: 'contract', expenses: 'expense', issues: 'issue' }
/** { relType, relId } from a CRM link such as /crm/tasks/<id> or /crm/tasks-board?task=<id>, or null. */
export function recordOfLink(link) {
    const m = /^\/crm\/([a-z-]+)(?:\/([a-f0-9]{24}))?(?:\?.*?\b(?:task|id)=([a-f0-9]{24}))?/i.exec(String(link || ''))
    const type = m && LINK_TYPES[m[1]], id = m && (m[2] || m[3])
    return type && oid(id) ? { relType: type, relId: id } : null
}

/** A reminder that is about nothing in particular: just a note with a time. */
export async function addFree(body = {}) {
    const staffId = await me()
    const date = new Date(body.date)
    if (Number.isNaN(+date)) throw fail('Choose a date and a time')
    const note = String(body.note || '').replace(/\s+/g, ' ').trim().slice(0, 500)
    if (!note) throw fail('Write what to remember')
    // a reminder made from a notification keeps the record it is about (a link of the CRM names the record)
    const rec = recordOfLink(body.link)
    const row = await prisma.crmReminder.create({ data: { staffId, creatorId: staffId, date, description: note, notifyByEmail: true, ...(rec || {}) } })
    return { id: row.id }
}

/** Change my reminder: its words, its time (a new future time rings again), or tick it done. */
export async function updateMine(id, body = {}) {
    const staffId = await me()
    const r = oid(id) && (await prisma.crmReminder.findFirst({ where: { id, staffId } }))
    if (!r) throw fail('Reminder not found', 404)
    const data = {}
    if (body.note !== undefined) data.description = String(body.note).replace(/\s+/g, ' ').trim().slice(0, 500) || null
    if (body.date !== undefined) {
        const d = new Date(body.date)
        if (Number.isNaN(+d)) throw fail('Choose a date and a time')
        data.date = d
        if (+d > Date.now()) data.isNotified = false
    }
    if (body.done !== undefined) data.isNotified = !!body.done
    if (Object.keys(data).length) await prisma.crmReminder.update({ where: { id }, data })
    return { id }
}
