import prisma from '@/lib/prisma'
import { getOptions, setOptions, mergeFields, sendTemplate } from '@/lib/crm/mailer'
import { publicBase } from '@/lib/crm/shortLinks'
import { requirePermission, isCrmAdmin } from '@/lib/crm/permissions'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const toHtml = (t) => esc(t).replace(/\r?\n/g, '<br />')

/** The merge fields an automatic message can use (shown in the settings window). */
export const AUTO_FIELDS = ['contact_firstname', 'client_name', 'ticket_id', 'ticket_subject', 'ticket_status', 'ticket_priority', 'ticket_department', 'agent_name', 'ticket_url', 'company_name']

async function readRules() {
    try { const v = JSON.parse((await getOptions(['ticket_auto_messages']))('ticket_auto_messages', '[]')); return Array.isArray(v) ? v : [] } catch { return [] }
}

/** Rules to edit: one per status of the tickets plus "ticket created", with what is saved. */
export async function getAutoRules() {
    const session = await requirePermission('tickets', 'view')
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Only an administrator can change the automatic messages', 403)
    const [saved, statuses] = await Promise.all([readRules(), prisma.crmTicketStatus.findMany({ orderBy: { statusOrder: 'asc' } })])
    const by = Object.fromEntries(saved.map((r) => [r.on, r]))
    const make = (on, title) => ({ on, title, enabled: !!by[on]?.enabled, message: by[on]?.message || '', email: by[on] ? by[on].email !== false : true, thread: by[on] ? by[on].thread !== false : true })
    return { rules: [make('created', 'When a request is received (created by the client)'), ...statuses.map((s) => ({ ...make(s.id, s.name), color: s.statusColor || '#64748b' }))], fields: AUTO_FIELDS }
}

export async function saveAutoRules(body) {
    const session = await requirePermission('tickets', 'view')
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Only an administrator can change the automatic messages', 403)
    const statuses = new Set((await prisma.crmTicketStatus.findMany({ select: { id: true } })).map((s) => s.id))
    const out = []
    for (const r of Array.isArray(body?.rules) ? body.rules : []) {
        if (r.on !== 'created' && !statuses.has(r.on)) continue
        const message = String(r.message || '').trim().slice(0, 5000)
        if (r.enabled && !message) throw fail('Write the message of every rule that is switched on')
        if (r.enabled && r.email === false && r.thread === false) throw fail('A rule must send the message by email or in the conversation (or both)')
        out.push({ on: r.on, enabled: !!r.enabled, message, email: r.email !== false, thread: r.thread !== false })
    }
    await setOptions({ ticket_auto_messages: JSON.stringify(out) })
    return { success: true }
}

async function varsFor(t) {
    const [dept, prio, status, agent, client, contact, o] = await Promise.all([
        t.departmentId ? prisma.crmDepartment.findUnique({ where: { id: t.departmentId }, select: { name: true } }) : null,
        t.priorityId ? prisma.crmTicketPriority.findUnique({ where: { id: t.priorityId }, select: { name: true } }) : null,
        t.statusId ? prisma.crmTicketStatus.findUnique({ where: { id: t.statusId }, select: { name: true } }) : null,
        t.assignedId ? prisma.crmStaff.findUnique({ where: { id: t.assignedId }, select: { firstName: true, lastName: true } }) : null,
        t.clientId ? prisma.crmClient.findUnique({ where: { id: t.clientId }, select: { company: true } }) : null,
        t.contactId ? prisma.crmContact.findUnique({ where: { id: t.contactId }, select: { firstName: true, email: true } }) : null,
        getOptions(['companyname']),
    ])
    return {
        contact_firstname: contact?.firstName || (t.name || '').split(' ')[0] || '', client_name: client?.company || '', ticket_id: String(t.legacyId ?? ''), ticket_subject: t.subject || '', ticket_status: status?.name || '',
        ticket_priority: prio?.name || '', ticket_department: dept?.name || '', agent_name: agent ? [agent.firstName, agent.lastName].filter(Boolean).join(' ') : '', ticket_url: `${publicBase()}/portal/tickets/${t.id}`, company_name: o('companyname'),
        _email: contact?.email || t.email || null,
    }
}

/**
 * Sends the automatic message of a rule: `on` = 'created' or the id of the status the ticket just got.
 * It is written in the conversation (marked automatic) and/or emailed to the client. Never throws: the action behind it must not fail.
 */
export async function autoMessage(t, on) {
    try {
        const rule = (await readRules()).find((r) => r.on === on && r.enabled && String(r.message || '').trim())
        if (!rule) return null
        const { _email, ...vars } = await varsFor(t)
        const text = mergeFields(rule.message, vars)
        let thread = false, mail = null
        if (rule.thread !== false) {
            const author = t.assignedId || (await prisma.crmStaff.findFirst({ where: { active: true, admin: true }, select: { id: true } }))?.id || (await prisma.crmStaff.findFirst({ where: { active: true }, select: { id: true } }))?.id
            if (author) {
                await prisma.crmTicketReply.create({ data: { ticketId: t.id, adminId: author, name: vars.company_name || 'Support', message: toHtml(text), internal: false, isAuto: true } })
                await prisma.crmTicket.update({ where: { id: t.id }, data: { lastReply: new Date(), clientRead: 0 } })
                thread = true
            }
        }
        if (rule.email !== false && _email) mail = await sendTemplate({ slug: 'ticket-reply', to: _email, data: { ...vars, ticket_message: text }, relType: 'ticket', relId: t.id })
        return { thread, mail }
    } catch (e) { console.error('[ticket auto message]', e.message); return null }
}
