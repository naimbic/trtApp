import prisma from '@/lib/prisma'
import { deliver, escapeHtml } from '@/lib/crm/mailer'
import { notifyStaffChannels } from '@/lib/crm/channels'
import { publicBase } from '@/lib/crm/shortLinks'

/** A note with a reminder tells its owner when the moment comes: the bell, an email and the Telegram / WhatsApp of their profile. */
export async function noteRemindersJob({ lines, dry }) {
    const rows = (await prisma.crmQuickNote.findMany({ where: { remindAt: { lte: new Date() } }, orderBy: { remindAt: 'asc' }, take: 200 })).filter((n) => n.remindAt && +new Date(n.remindedFor || 0) !== +n.remindAt)
    for (const n of rows) {
        const who = n.addedFrom ? await prisma.crmStaff.findUnique({ where: { id: n.addedFrom }, select: { id: true, email: true, firstName: true, active: true } }) : null
        if (dry) { lines.push(`[preview] Reminder of the note “${n.title}” would be sent${who ? ` to ${who.email || who.firstName}` : ''}`); continue }
        // mark it first, so two runs at the same time never send it twice
        const claimed = await prisma.crmQuickNote.updateMany({ where: { id: n.id, remindAt: n.remindAt }, data: { remindedFor: n.remindAt } })
        if (!claimed.count) continue
        if (!who?.active) { lines.push(`Reminder of “${n.title}” skipped: its owner is not active`); continue }
        const link = '/crm/tasks'
        const text = String(n.description || '').replace(/\s+/g, ' ').trim().slice(0, 300)
        try { await prisma.crmNotification.create({ data: { toUserId: who.id, fromFullName: '⏰ Reminder', description: `${n.title}${text ? `: ${text}` : ''}`.slice(0, 200), link, additionalData: 'note-reminder', isRead: false } }) } catch (e) { lines.push(`! Bell notification of “${n.title}” failed: ${e.message}`) }
        notifyStaffChannels(who.id, `⏰ Reminder: ${n.title}${text ? `\n${text}` : ''}\n${publicBase()}${link}`)
        let mailed = 'no email'
        if (who.email) {
            const r = await deliver({ to: who.email, subject: `⏰ Reminder: ${n.title}`, html: `<p><strong>⏰ ${escapeHtml(n.title)}</strong></p>${text ? `<p>${escapeHtml(text)}</p>` : ''}<p><a href="${publicBase()}${link}">${publicBase()}${link}</a></p>` })
            mailed = r.sent ? 'email sent' : `email failed: ${r.error}`
        }
        lines.push(`Reminder of the note “${n.title}” sent (${mailed})`)
    }
}
