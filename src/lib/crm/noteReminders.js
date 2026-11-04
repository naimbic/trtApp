import prisma from '@/lib/prisma'
import { notifyStaffChannels } from '@/lib/crm/channels'
import { publicBase } from '@/lib/crm/shortLinks'
import { reminderLink } from '@/lib/crm/notifications'
import { sendStaffMail, staffMailContext, textsFor } from '@/lib/crm/notifyMail'

/** A note with a reminder tells its owner when the moment comes: the bell, an email and the Telegram / WhatsApp of their profile. */
export async function noteRemindersJob({ lines, dry }) {
    await ticketRemindersJob({ lines, dry })
    const rows = (await prisma.crmQuickNote.findMany({ where: { AND: [{ remindAt: { not: null } }, { remindAt: { lte: new Date() } }] }, orderBy: { remindAt: 'asc' }, take: 200 })).filter((n) => n.remindAt && +new Date(n.remindedFor || 0) !== +n.remindAt)
    for (const n of rows) {
        const who = n.addedFrom ? await prisma.crmStaff.findUnique({ where: { id: n.addedFrom }, select: { id: true, email: true, firstName: true, active: true } }) : null
        if (dry) { lines.push(`[preview] Reminder of the note “${n.title}” would be sent${who ? ` to ${who.email || who.firstName}` : ''}`); continue }
        // mark it first, so two runs at the same time never send it twice
        const claimed = await prisma.crmQuickNote.updateMany({ where: { id: n.id, remindAt: n.remindAt }, data: { remindedFor: n.remindAt } })
        if (!claimed.count) continue
        if (!who?.active) { lines.push(`Reminder of “${n.title}” skipped: its owner is not active`); continue }
        const link = `/crm/notes?note=${n.id}`
        const text = String(n.description || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
        // a note shared with colleagues can remind them too (bell, push, Telegram / WhatsApp)
        if (n.remindShared) for (const to of n.sharedWith || []) { try { await prisma.crmNotification.create({ data: { toUserId: to, fromFullName: '⏰ Reminder', description: `${n.title}${text ? `: ${text}` : ''}`.slice(0, 200), link, additionalData: 'note-reminder', isRead: false } }); notifyStaffChannels(to, `⏰ Reminder: ${n.title}${text ? `\n${text}` : ''}\n${publicBase()}${link}`) } catch { /* one colleague failing never stops the others */ } }
        try { await prisma.crmNotification.create({ data: { toUserId: who.id, fromFullName: '⏰ Reminder', description: `${n.title}${text ? `: ${text}` : ''}`.slice(0, 200), link, additionalData: 'note-reminder', isRead: false } }) } catch (e) { lines.push(`! Bell notification of “${n.title}” failed: ${e.message}`) }
        notifyStaffChannels(who.id, `⏰ Reminder: ${n.title}${text ? `\n${text}` : ''}\n${publicBase()}${link}`)
        let mailed = 'no email'
        if (who.email) {
            const ctx = await staffMailContext(who.id)
            const r = await sendStaffMail({ staffId: who.id, relType: 'note', title: n.title || text.slice(0, 60), link, note: text, noteLabel: 'yourNote', introKey: 'reminderIntro', subject: `⏰ ${textsFor(ctx.language).reminder}: ${n.title || text.slice(0, 60)}`, slug: 'note-reminder' })
            mailed = r.sent ? 'email sent' : `email failed: ${r.error}`
        }
        lines.push(`Reminder of the note “${n.title}” sent (${mailed})`)
    }
}

/** The reminders people set on a record (a ticket, a client, a lead, a task...): the bell, an email and the Telegram / WhatsApp of the person who set them. */
export async function ticketRemindersJob({ lines, dry }) {
    const rows = await prisma.crmReminder.findMany({ where: { isNotified: false, AND: [{ date: { not: null } }, { date: { lte: new Date() } }] }, orderBy: { date: 'asc' }, take: 200 })
    for (const r of rows) {
        const [who, t] = await Promise.all([r.staffId ? prisma.crmStaff.findUnique({ where: { id: r.staffId }, select: { id: true, email: true, active: true } }) : null, r.relType === 'ticket' && r.relId ? prisma.crmTicket.findUnique({ where: { id: r.relId }, select: { id: true, legacyId: true, subject: true } }) : null])
        const note = String(r.description || '').trim()
        const kind = r.relType ? String(r.relType).replace(/_/g, ' ') : ''
        const title = r.relType === 'ticket' ? (t ? `Ticket #${t.legacyId ?? String(t.id).slice(-5).toUpperCase()} ${t.subject || ''}`.trim() : 'Ticket') : `Reminder${kind ? ` · ${kind}` : ''}`
        if (dry) { lines.push(`[preview] Reminder of ${title} would be sent`); continue }
        const claimed = await prisma.crmReminder.updateMany({ where: { id: r.id, isNotified: false }, data: { isNotified: true } })
        if (!claimed.count) continue
        if (!who?.active || (r.relType === 'ticket' && !t)) { lines.push(`Reminder of ${title} skipped: ${who?.active ? 'the ticket no longer exists' : 'its owner is not active'}`); continue }
        const link = r.relType === 'ticket' ? `/crm/tickets/${t.id}` : (reminderLink(r) || '/crm/notifications')
        try { await prisma.crmNotification.create({ data: { toUserId: who.id, fromFullName: '⏰ Reminder', description: `${r.relType === 'ticket' ? title : note || title}${r.relType === 'ticket' && note ? `: ${note}` : ''}`.slice(0, 200), link, additionalData: r.relType === 'ticket' ? 'ticket-reminder' : 'record-reminder', isRead: false } }) } catch (e) { lines.push(`! Bell notification of ${title} failed: ${e.message}`) }
        notifyStaffChannels(who.id, `⏰ Reminder: ${title}${note ? `\n${note}` : ''}\n${publicBase()}${link}`)
        let mailed = 'no email'
        if (who.email && r.notifyByEmail !== false) {
            const ctx = await staffMailContext(who.id)
            const res = await sendStaffMail({ staffId: who.id, relType: r.relType, relId: r.relId, title, link, note, noteLabel: 'yourNote', subject: `⏰ ${textsFor(ctx.language).reminder}: ${note ? note.slice(0, 80) : title}`, slug: 'record-reminder' })
            mailed = res.sent ? 'email sent' : `email failed: ${res.error}`
        }
        lines.push(`Reminder of ${title} sent (${mailed})`)
    }
}
