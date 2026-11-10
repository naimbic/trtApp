import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { scope } from '@/lib/crm/clientsApi'
import { notifyComment } from '@/lib/crm/mentionsApi'
import { mailData, checkSchedule, draftFrom, senderOptions, dropMailFiles, sendDraftCore } from '@/lib/crm/leadsApi'

/* The mails of a client (customer): the same as the mails of a lead (log a received or sent mail, drafts with checks, files, send now or at a date and time),
   kept in the same table with clientId instead of leadId. */
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

/** The client (only one the person may see) and what they may do with its mails. The mail rights (Roles > Client mails: Create / Edit / Send / Delete) come on top of seeing the client;
 *  changing another person's mail also needs "Edit mails logged by others". `cap` is the mail right the action needs. */
async function gate(id, { cap = null } = {}) {
    const session = await requirePermission('customers', 'view_own')
    const authority = session.user.authority || []
    const sc = await scope(session)
    const client = oid(id) && (await prisma.crmClient.findFirst({ where: { AND: [{ id }, sc] }, select: { id: true, company: true } }))
    if (!client) throw fail('Client not found', 404)
    const staffId = await getStaffId(session)
    const admin = isCrmAdmin(authority)
    const mail = Object.fromEntries(['create', 'edit', 'send', 'delete'].map((c) => [c, admin || hasCap(authority, 'client_mails', c)]))
    if (cap && !mail[cap]) throw fail(`You are not allowed to ${cap === 'create' ? 'add' : cap} mails`, 403)
    const a = { staffId: staffId || undefined, session, authority, admin, mail, can: (c) => admin || hasCap(authority, 'customers', c) }
    return { a, client }
}
const mayChange = (a, by) => (!!a.staffId && by === a.staffId) || a.can('edit_others_mails')
const mayDrop = (a, by) => (!!a.staffId && by === a.staffId) || a.can('delete')

/** The address to write to by default: the primary contact of the client, else the first contact with an email. */
async function clientEmail(id) {
    const contacts = await prisma.crmContact.findMany({ where: { clientId: id, NOT: { email: null } }, select: { email: true, isPrimary: true, active: true }, orderBy: { isPrimary: 'desc' }, take: 20 })
    return (contacts.find((c) => c.isPrimary && c.email) || contacts.find((c) => c.active !== false && c.email) || contacts[0])?.email || ''
}

/** The mails of the client, the addresses a draft may be sent from, and what the person may do. */
export async function getClientMails(id) {
    const { a } = await gate(id)
    const [mails, senders, email] = await Promise.all([prisma.crmLeadMail.findMany({ where: { clientId: id }, orderBy: { date: 'desc' }, take: 200 }), senderOptions(a), clientEmail(id)])
    const staff = await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(mails.map((m) => m.addedFrom).filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } })
    const people = Object.fromEntries(staff.map((s) => [s.id, { id: s.id, name: staffName(s), image: s.profileImage || null }]))
    const { filesByMail } = await import('@/lib/crm/mailCatch')
    const mailFiles = await filesByMail(mails)
    const { commentsByMail } = await import('@/lib/crm/mailCatch')
    const mailComments = await commentsByMail(mails)
    return {
        email, senders, can: a.mail,
        mails: mails.map((m) => ({ files: mailFiles[m.id] || [], comments: (mailComments[m.id] || []).map((c) => ({ ...c, mine: !!a.staffId && c.by?.id === a.staffId })), id: m.id, direction: m.direction, subject: m.subject || '', from: m.direction === 'draft' ? draftFrom(m.fromAddress, senders) : m.fromAddress || '', to: m.direction === 'draft' ? m.toAddress || email || '' : m.toAddress || '', cc: m.ccAddress || '', bcc: m.bccAddress || '', replyTo: m.replyTo || '', note: m.note || '', checks: Array.isArray(m.checks) ? m.checks : [], scheduledAt: m.scheduledAt || null, sendError: m.sendError || '', body: m.body || '', date: m.date, by: people[m.addedFrom] || null, source: m.source, mine: !!a.staffId && m.addedFrom === a.staffId, canEdit: a.mail.edit && mayChange(a, m.addedFrom), canSend: a.mail.send && mayChange(a, m.addedFrom), canDelete: mayDrop(a, m.addedFrom) && a.mail.delete })),
    }
}

export async function saveClientMail(id, body, mailId) {
    const { a, client } = await gate(id, { cap: mailId ? 'edit' : 'create' })
    const data = mailData(body)
    if (data.direction === 'draft' && data.scheduledAt && !a.mail.send) throw fail('You are not allowed to send or schedule mails', 403)
    const known = { email: await clientEmail(id) }
    if (mailId) {
        const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, clientId: id } }))
        if (!m) throw fail('Mail not found', 404)
        if (!mayChange(a, m.addedFrom)) throw fail('You can only edit the mails you logged', 403)
        if (data.direction === 'draft' && m.direction !== 'draft') throw fail('A mail that is already sent or received cannot go back to a draft')
        const fields = ['subject', 'fromAddress', 'toAddress', 'ccAddress', 'bccAddress', 'replyTo', 'body']
        const changed = m.direction === 'draft' && fields.some((k) => (m[k] || null) !== (data[k] || null))
        if (changed) data.checks = data.checks.map((c) => ({ ...c, done: false })) // changing what will be sent cancels the confirmations
        const cancelled = data.direction === 'draft' ? checkSchedule(data, known, m, changed) : false
        await prisma.crmLeadMail.update({ where: { id: mailId }, data })
        return { success: true, id: mailId, scheduleCancelled: cancelled }
    }
    if (data.direction === 'draft') checkSchedule(data, known, null, false)
    const m = await prisma.crmLeadMail.create({ data: { ...data, clientId: id, addedFrom: a.staffId, source: 'manual' } })
    if (data.direction !== 'draft') await prisma.crmActivityLog.create({ data: { description: `${data.direction === 'out' ? 'Mail sent' : 'Mail received'} logged on ${client.company || 'a client'}${data.subject ? `: ${data.subject}` : ''}`.slice(0, 400), staffId: a.staffId } }).catch(() => {})
    return { success: true, id: m.id }
}

/** The staff who look after the client: told about what happens on its mails. */
const accountTeam = async (id) => (await prisma.crmCustomerAdmin.findMany({ where: { clientId: id }, select: { staffId: true } })).map((x) => x.staffId)

/** An internal comment on a mail of the client. */
export async function commentClientMail(id, mailId, content) {
    const { a, client } = await gate(id)
    const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, clientId: id }, select: { id: true, subject: true } }))
    if (!m) throw fail('Mail not found', 404)
    const { storeRich } = await import('@/lib/crm/richText')
    const text = storeRich(content)
    if (!text) throw fail('Write a comment first')
    await prisma.crmNote.create({ data: { relType: 'leadmail', relId: m.id, description: text, dateContacted: new Date(), addedFrom: a.staffId } })
    try { await notifyComment({ by: { staffId: a.staffId, name: a.session.user.name }, text, link: `/crm/clients/${id}`, subject: `${client.company || 'Client'} · ${m.subject || 'mail'}`, recipients: await accountTeam(id) }) } catch (e) { console.error('[mail comment notify]', e.message) }
    return { success: true }
}

/** Tags a colleague on a mail of the client. */
export async function mentionClientMail(id, mailId, staffId) {
    const { client } = await gate(id)
    const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, clientId: id }, select: { id: true, subject: true } }))
    if (!m) throw fail('Mail not found', 404)
    if (!oid(staffId)) throw fail('Choose a colleague')
    const { notifyMentions } = await import('@/lib/crm/mentionsApi')
    await notifyMentions({ staffIds: [staffId], text: `✉ ${m.subject || 'mail'} (${client.company || 'client'})`, url: `/crm/clients/${id}` })
    return { success: true }
}

export async function checkClientDraft(id, mailId, index, done) {
    await gate(id, { cap: 'edit' })
    const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, clientId: id } }))
    if (!m) throw fail('Mail not found', 404)
    if (m.direction !== 'draft') throw fail('This mail is not a draft')
    const checks = Array.isArray(m.checks) ? m.checks.map((c) => ({ ...c })) : []
    if (!checks[index]) throw fail('Check not found', 404)
    checks[index].done = !!done
    await prisma.crmLeadMail.update({ where: { id: mailId }, data: { checks } })
    return { success: true }
}

/** Sends a draft of the client now (the author, or who may edit mails of others). */
export async function sendClientDraft(id, mailId) {
    const { a, client } = await gate(id, { cap: 'send' })
    const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, clientId: id } }))
    if (!m) throw fail('Mail not found', 404)
    if (m.direction !== 'draft') throw fail('This mail is not a draft')
    if (!mayChange(a, m.addedFrom)) throw fail('You can only send the drafts you wrote', 403)
    return deliver({ client, m, a, how: '' })
}

async function deliver({ client, m, a, how }) {
    await sendDraftCore({ m, a, fallbackTo: await clientEmail(client.id) })
    await prisma.crmActivityLog.create({ data: { description: `Mail sent${how} to ${client.company || 'a client'}: ${m.subject}`.slice(0, 400), staffId: a.staffId } }).catch(() => {})
    return { success: true, id: m.id }
}

export async function deleteClientMail(id, mailId) {
    const { a } = await gate(id, { cap: 'delete' })
    const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, clientId: id } }))
    if (!m) throw fail('Mail not found', 404)
    if (!mayDrop(a, m.addedFrom)) throw fail('You can only delete the mails you logged', 403)
    await prisma.crmLeadMail.delete({ where: { id: mailId } })
    await dropMailFiles([mailId])
    return { success: true }
}

/** One scheduled draft of a client whose time has come (called by the lead mails job): claimed first so two runs never send it twice; a failure is not retried, the author is told. */
export async function sendScheduledClientMail(m, { dry = false } = {}) {
    const client = await prisma.crmClient.findUnique({ where: { id: m.clientId }, select: { id: true, company: true } })
    const label = `"${m.subject || '(no subject)'}"${client ? ` (${client.company || 'client'})` : ''}`
    if (dry) return [`[preview] The scheduled mail ${label} would be sent`]
    const claimed = await prisma.crmLeadMail.updateMany({ where: { id: m.id, direction: 'draft', scheduledAt: m.scheduledAt }, data: { scheduledAt: null } })
    if (!claimed.count) return []
    const author = m.addedFrom ? await prisma.crmStaff.findUnique({ where: { id: m.addedFrom }, select: { firstName: true, lastName: true, email: true } }) : null
    const a = { staffId: m.addedFrom || undefined, session: { user: { name: author ? staffName(author) : 'Scheduled mail' } } }
    const link = `/crm/clients/${m.clientId}?tab=mails`
    try {
        if (!client) throw new Error('The client no longer exists')
        await deliver({ client, m, a, how: ' (scheduled)' })
        try { if (m.addedFrom) await notifyComment({ by: { staffId: undefined, name: 'CRM' }, text: `✉ Scheduled mail sent: ${m.subject || ''}`, link, subject: client.company || 'Client', recipients: [m.addedFrom] }) } catch (e) { console.error('[mail notification]', e.message) }
        return [`Scheduled mail sent: ${label}`]
    } catch (e) {
        const why = String(e.message || e).slice(0, 300)
        await prisma.crmLeadMail.update({ where: { id: m.id }, data: { sendError: why } }).catch(() => {})
        try { if (client && m.addedFrom) await notifyComment({ by: { staffId: undefined, name: 'CRM' }, text: `✉ Scheduled mail not sent: ${m.subject || ''} (${why})`, link, subject: client.company || 'Client', recipients: [m.addedFrom] }) } catch (err) { console.error('[mail notification]', err.message) }
        return [`! Scheduled mail ${label} was not sent: ${why}`]
    }
}
