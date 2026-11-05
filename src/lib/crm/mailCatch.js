// Emails that people already in the CRM (a lead, or the contact of a client) send to the mailbox: kept on their Mails tab as
// received mail with the attached files, a meeting invitation becomes a calendar event, the team is told, a reminder to answer is
// set and, when switched on, a short automatic answer ("we received your email") goes back. Called by leadMail.js for every email
// that is not a website contact form. Pure of IMAP: it works on an email already parsed by mailparser.
import prisma from '@/lib/prisma'
import { processUpload, putMedia } from '@/lib/media'
import { cleanHtml, plainText } from '@/lib/crm/richText'
import { notifyComment } from '@/lib/crm/mentionsApi'

const lower = (v) => String(v || '').trim().toLowerCase()
const escHtml = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const MAX_FILES = 10
const AUTO_FROM = /(^|[._+-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounces?|notifications?|newsletter)([._+@-]|$)/i

/** Robots and lists: out-of-office answers, newsletters, bounces. Never answered, and not worth a reminder. */
export function isAutomatic(mail, address = '') {
    const h = (k) => String(mail?.headers?.get?.(k) ?? '').toLowerCase()
    const auto = h('auto-submitted')
    if (auto && auto !== 'no') return true
    if (/bulk|list|junk|auto_reply/.test(h('precedence'))) return true
    if (h('list-id') || h('list-unsubscribe') || h('x-autoreply') || h('x-autorespond') || h('x-auto-response-suppress')) return true
    return AUTO_FROM.test(lower(address))
}

/* ---------------- meeting invitations (.ics) ---------------- */

const icsDate = (v, params = '') => {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(String(v || '').trim())
    if (!m) return null
    const [, y, mo, d, h = '0', mi = '0', s = '0', z] = m
    const date = z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) : new Date(+y, +mo - 1, +d, +h, +mi, +s)
    return { date, allDay: !m[4] && /VALUE=DATE/i.test(params) }
}

/** The first meeting of an invitation: title, start, end, place and the video link in it. */
export function parseIcs(text) {
    const unfolded = String(text || '').replace(/\r?\n[ \t]/g, '')
    const block = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/i.exec(unfolded)?.[1]
    if (!block) return null
    const prop = (name) => {
        const m = new RegExp(`^${name}((?:;[^:\\r\\n]*)?):(.*)$`, 'im').exec(block)
        return m ? { params: m[1] || '', value: m[2].trim().replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1') } : null
    }
    const start = prop('DTSTART') && icsDate(prop('DTSTART').value, prop('DTSTART').params)
    if (!start) return null
    const end = prop('DTEND') && icsDate(prop('DTEND').value, prop('DTEND').params)
    const method = /^METHOD:(.*)$/im.exec(unfolded)?.[1]?.trim().toUpperCase() || 'REQUEST'
    const where = [prop('LOCATION')?.value, prop('URL')?.value, prop('DESCRIPTION')?.value].filter(Boolean).join(' ')
    const link = /https?:\/\/[^\s<>"')]*(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|whereby\.com|webex\.com|meet\.trtcrm\.com|gotomeeting\.com)[^\s<>"')]*/i.exec(where)?.[0] || null
    return { method, title: prop('SUMMARY')?.value || '', start: start.date, end: end?.date || null, allDay: start.allDay, location: prop('LOCATION')?.value || '', link }
}

/* ---------------- who wrote ---------------- */

/** The lead (by its email) or the client (by the email of one of its contacts) behind an address, or null. */
export async function whoIs(address) {
    const a = lower(address)
    if (!a) return null
    const lead = await prisma.crmLead.findFirst({ where: { email: { equals: a, mode: 'insensitive' }, junk: false }, orderBy: { createdAt: 'desc' } })
    if (lead) return { kind: 'lead', id: lead.id, name: lead.name || lead.company || a, record: lead }
    const contact = await prisma.crmContact.findFirst({ where: { email: { equals: a, mode: 'insensitive' } }, select: { clientId: true, firstName: true, lastName: true } })
    if (!contact?.clientId) return null
    const client = await prisma.crmClient.findUnique({ where: { id: contact.clientId }, select: { id: true, company: true } })
    if (!client) return null
    return { kind: 'client', id: client.id, name: client.company || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || a, record: client }
}

/** Who has to know and answer: the team of a lead (or the account managers of a client) and the mailbox's responsible person. */
async function team(cfg, who) {
    let ids = []
    if (who.kind === 'lead') ids = [who.record.assigned, ...(who.record.assignedIds || []), ...(who.record.followerIds || []), who.record.addedFrom]
    else ids = (await prisma.crmCustomerAdmin.findMany({ where: { clientId: who.id }, select: { staffId: true } })).map((x) => x.staffId)
    const all = [...new Set([cfg.responsible, ...ids].filter(Boolean))]
    const active = all.length ? await prisma.crmStaff.findMany({ where: { id: { in: all }, active: true }, select: { id: true } }) : []
    const ok = new Set(active.map((s) => s.id))
    return all.filter((i) => ok.has(i))
}

/* ---------------- files ---------------- */

/** Keeps the attached files of the email on the mail (they open from its Mails tab). Returns the names kept and the ones left out. */
async function keepFiles(mail, mailId) {
    const kept = [], left = []
    const list = (mail.attachments || []).filter((a) => a.content && a.filename && !/^(text\/calendar|application\/ics)/i.test(a.contentType || '') && !/\.ics$/i.test(a.filename || '') && !(a.related && /^image\//i.test(a.contentType || '') && (a.size || 0) < 15000))
    for (const a of list.slice(0, MAX_FILES)) {
        try {
            const file = new File([a.content], a.filename, { type: a.contentType || 'application/octet-stream' })
            const p = await processUpload(file, { purpose: 'attachment' })
            const { key, url } = await putMedia(p, 'mail')
            await prisma.crmMedia.create({ data: { name: p.name, key, url, mime: p.contentType, kind: p.kind, size: p.size, originalSize: p.originalSize, width: p.width, height: p.height, purpose: 'attachment', parentId: null, relType: 'leadmail', relId: mailId, uploaderName: 'Mailbox' } })
            kept.push(p.name)
        } catch (e) { left.push(`${a.filename} (${String(e.message).slice(0, 80)})`) }
    }
    for (const a of list.slice(MAX_FILES)) left.push(`${a.filename} (more than ${MAX_FILES} files)`)
    return { kept, left }
}

/* ---------------- the automatic answer ---------------- */

const DEFAULT_REPLY = 'Hello {name},\n\nThank you for your email: we received it, we will check your request and get back to you as soon as possible.\n\nBest regards'

/** "We received your email". Once a day per person at most, never to robots, and kept on the Mails tab as a sent mail. */
export async function autoReply(cfg, { to, name, subject, messageId, mail, leadId = null, clientId = null }) {
    if (!cfg.autoReply || !to || lower(to) === lower(cfg.email)) return { sent: false, reason: 'off' }
    if (mail && isAutomatic(mail, to)) return { sent: false, reason: 'automatic sender' }
    const link = leadId ? { leadId } : { clientId }
    const recent = await prisma.crmLeadMail.findFirst({ where: { ...link, direction: 'out', source: 'autoreply', date: { gte: new Date(Date.now() - 24 * 3600000) } }, select: { id: true } })
    if (recent) return { sent: false, reason: 'already answered today' }
    const merge = (t) => String(t || '').replace(/\{name\}/g, name || '').replace(/\{subject\}/g, subject || '')
    const text = merge(cfg.autoReplyBody || DEFAULT_REPLY)
    const html = `<p>${escHtml(text).replace(/\n/g, '<br>')}</p>`
    const reSubject = merge(cfg.autoReplySubject) || (subject ? `Re: ${subject.replace(/^(re|fw|fwd)\s*:\s*/i, '')}` : 'We received your email')
    const { deliver } = await import('@/lib/crm/mailer')
    const res = await deliver({ to, subject: reSubject, html, fromEmail: cfg.email, headers: { 'Auto-Submitted': 'auto-replied', 'X-Auto-Response-Suppress': 'All', ...(messageId ? { 'In-Reply-To': messageId, References: messageId } : {}) } })
    if (!res.sent) { console.error('[auto reply]', res.error); return { sent: false, reason: res.error } }
    await prisma.crmLeadMail.create({ data: { ...link, direction: 'out', subject: reSubject, fromAddress: cfg.email, toAddress: to, body: html, date: new Date(), source: 'autoreply' } }).catch(() => {})
    return { sent: true }
}

/* ---------------- the email itself ---------------- */

/**
 * Keeps one email on the Mails tab of the lead or client who wrote it. Returns { caught: false, reason } when the sender is nobody in the
 * CRM (or a robot), else { caught: true, ... }. `dry` decides and saves nothing.
 */
export async function catchReply(cfg, { msg, mail }, { dry = false } = {}) {
    const address = lower(msg.fromAddress)
    if (!address) return { caught: false, reason: 'No sender address' }
    if (address === lower(cfg.email)) return { caught: false, reason: 'Sent from this mailbox itself' }
    if (isAutomatic(mail, address)) return { caught: false, reason: 'Automatic email (newsletter, bounce or out-of-office)' }
    const who = (await whoIs(address)) || (msg.replyTo ? await whoIs(msg.replyTo) : null)
    if (!who) return { caught: false, reason: 'The sender is not a lead or a client contact' }
    if (dry) return { caught: true, kind: who.kind, name: who.name, reason: `Reply from ${who.name}: would be added to its Mails` }

    const link = who.kind === 'lead' ? { leadId: who.id } : { clientId: who.id }
    const html = mail?.html ? cleanHtml(String(mail.html)) : `<p>${escHtml(String(msg.text || '').slice(0, 20000)).replace(/\n/g, '<br>')}</p>`
    const row = await prisma.crmLeadMail.create({ data: { ...link, direction: 'in', subject: msg.subject || null, fromAddress: msg.fromAddress || null, toAddress: cfg.email || null, body: (html || '<p></p>').slice(0, 60000), date: msg.date || new Date(), source: 'mailbox' } })
    const { kept, left } = mail ? await keepFiles(mail, row.id) : { kept: [], left: [] }

    // a meeting invitation in the email: an event on the calendar, about this lead or client
    let meeting = null
    const ics = (mail?.attachments || []).find((a) => /^(text\/calendar|application\/ics)/i.test(a.contentType || '') || /\.ics$/i.test(a.filename || ''))
    const inv = ics?.content ? parseIcs(Buffer.from(ics.content).toString('utf8')) : null
    if (inv && inv.method !== 'CANCEL' && inv.method !== 'REPLY') {
        const owner = cfg.responsible || null
        const ev = await prisma.crmEvent.create({ data: { title: (inv.title || msg.subject || `Meeting with ${who.name}`).slice(0, 200), description: `Booked by email from ${msg.fromName || msg.fromAddress}`, start: inv.start, end: inv.end || new Date(+inv.start + 3600000), allDay: inv.allDay, category: 'meeting', color: 'blue', isPublic: true, userId: owner || undefined, attendeeIds: owner ? [owner] : [], location: inv.location || null, meetingUrl: inv.link || null, ...(who.kind === 'lead' ? { leadId: who.id } : { clientId: who.id }) } })
        meeting = { id: ev.id, title: ev.title, start: ev.start }
    }

    const plain = plainText(html).replace(/\s+/g, ' ').trim()
    const excerpt = `✉ ${meeting ? '📅 ' : ''}${msg.fromName || msg.fromAddress}: ${msg.subject || plain}`.slice(0, 160)
    const crm = who.kind === 'lead' ? `/crm/leads/${who.id}?tab=mails` : `/crm/clients/${who.id}`
    if (who.kind === 'lead') {
        await prisma.crmLead.update({ where: { id: who.id }, data: { lastContact: msg.date || new Date() } }).catch(() => {})
        await prisma.crmLeadActivityLog.create({ data: { leadId: who.id, description: `Email received${kept.length ? ` with ${kept.length} file${kept.length === 1 ? '' : 's'}` : ''}${meeting ? ' and a meeting booking' : ''}: ${msg.subject || ''}`.slice(0, 300), fullName: 'Email integration', customActivity: true } }).catch(() => {})
    }

    // the team is told, and someone is asked to answer
    const people = await team(cfg, who)
    try { await notifyComment({ by: { staffId: undefined, name: 'Mailbox' }, text: excerpt, link: crm, subject: who.name, recipients: people }) } catch (e) { console.error('[mail catch notify]', e.message) }
    const answerer = people[0] || null
    if (cfg.followUpTask !== false) {
        const task = await prisma.crmTask.create({ data: { name: `Reply to ${who.name}: ${msg.subject || 'email'}`.slice(0, 200), description: plain.slice(0, 2000), priority: 3, startDate: new Date(), dueDate: new Date(Date.now() + (cfg.followUpHours ?? 24) * 3600000), relType: who.kind === 'lead' ? 'lead' : 'customer', relId: who.id, status: 1 } }).catch(() => null)
        if (task && answerer) await prisma.crmTaskAssigned.create({ data: { taskId: task.id, staffId: answerer } }).catch(() => {})
    }
    const hours = cfg.replyReminderHours ?? 4
    if (answerer && hours > 0) {
        await prisma.crmReminder.create({ data: { relType: who.kind === 'lead' ? 'lead' : 'customer', relId: who.id, staffId: answerer, creatorId: answerer, date: new Date(Date.now() + hours * 3600000), description: `✉ Reply to ${who.name}: ${msg.subject || ''}`.slice(0, 300), tab: who.kind === 'lead' ? 'mails' : null, notifyByEmail: true, isNotified: false } }).catch(() => {})
    }

    const reply = await autoReply(cfg, { to: msg.fromAddress, name: who.name, subject: msg.subject, messageId: msg.messageId, mail, ...link }).catch((e) => ({ sent: false, reason: e.message }))
    return { caught: true, kind: who.kind, id: who.id, name: who.name, files: kept, filesLeft: left, meeting, autoReplied: !!reply.sent, reason: `Reply from ${who.name} added to its Mails${kept.length ? ` with ${kept.length} file${kept.length === 1 ? '' : 's'}` : ''}${meeting ? ', meeting booked in the calendar' : ''}${reply.sent ? ', automatic answer sent' : ''}${left.length ? `; left out: ${left.join(', ')}` : ''}` }
}

/** A staff member answered: the reminders to answer this lead or client are no longer needed. */
export const dropReplyReminders = (relType, relId) => prisma.crmReminder.deleteMany({ where: { relType, relId, isNotified: false, description: { startsWith: '✉ Reply to' } } }).catch(() => {})

/** The files kept on each mail of a list: { mailId: [{ id, name, url, kind, size }] }. */
export async function filesByMail(mails) {
    const ids = (mails || []).map((m) => m.id)
    if (!ids.length) return {}
    const rows = await prisma.crmMedia.findMany({ where: { relType: 'leadmail', relId: { in: ids }, isFolder: false }, orderBy: { createdAt: 'asc' } })
    const out = {}
    for (const r of rows) (out[r.relId] ||= []).push({ id: r.id, name: r.name, url: r.url, kind: r.kind, size: r.size })
    return out
}
