import prisma from '@/lib/prisma'
import { sendTemplate } from '@/lib/crm/mailer'
import { notifyNotice } from '@/lib/crm/notifyMail'

const UNIT = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 7 * 86400000 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** The reminder of a calendar event, at the time chosen ("30 minutes before"): the team members of the event are told on the bell and on Telegram / WhatsApp, and,
 *  when "remind the client too" is on, the client's contact, the lead and the guests get the chosen email template. Sent once: it is claimed before anything goes out. */
export async function eventRemindersJob({ lines, dry }) {
    const now = new Date()
    const rows = await prisma.crmEvent.findMany({ where: { reminderBefore: { not: null }, start: { gt: now, lt: new Date(+now + 60 * 86400000) } }, orderBy: { start: 'asc' }, take: 500 })
    for (const e of rows) {
        if (e.reminderSentAt || ['draft', 'declined'].includes(e.status || 'confirmed')) continue
        const before = (e.reminderBefore || 0) * (UNIT[e.reminderBeforeType] || UNIT.minutes)
        if (+e.start - before > +now) continue // not yet
        if (dry) { lines.push(`[preview] Reminder of the event “${e.title}” would be sent${e.remindClient ? ' (client too)' : ''}`); continue }
        const claimed = await prisma.crmEvent.updateMany({ where: { id: e.id, OR: [{ reminderSentAt: null }, { reminderSentAt: { isSet: false } }] }, data: { reminderSentAt: now } })
        if (!claimed.count) continue
        const when = new Date(e.start)
        const mins = Math.max(1, Math.round((+when - +now) / 60000))
        const inText = mins >= 1440 ? `${Math.round(mins / 1440)} day(s)` : mins >= 60 ? `${Math.round(mins / 60)} h` : `${mins} min`
        // the team
        const staffIds = [...new Set([e.userId, ...(e.attendeeIds || [])].filter(Boolean))]
        const staff = staffIds.length ? await prisma.crmStaff.findMany({ where: { id: { in: staffIds }, active: true }, select: { id: true } }) : []
        for (const s of staff) {
            await prisma.crmNotification.create({ data: { toUserId: s.id, fromFullName: '⏰ Reminder', description: `In ${inText}: ${e.title}`.slice(0, 200), link: `/calendar?event=${e.id}`, additionalData: 'event-reminder', isRead: false } }).catch(() => {})
            notifyNotice(s.id, { kind: 'calendar', headlineKey: 'startsIn', vars: { when: inText }, title: e.title, link: '/calendar', rows: [[e.meetingUrl ? 'Link' : '', e.meetingUrl || ''], [e.location ? '📍' : '', e.location || '']].filter(([k]) => k) })
        }
        // the client, the lead and the guests
        let mailed = 0
        if (e.remindClient) {
            const to = new Set((e.attendeeEmails || []).map((x) => String(x).trim().toLowerCase()))
            if (e.clientId) for (const c of await prisma.crmContact.findMany({ where: { clientId: e.clientId, email: { not: null } }, orderBy: { isPrimary: 'desc' }, select: { email: true, isPrimary: true } }).then((l) => (l.some((x) => x.isPrimary) ? l.filter((x) => x.isPrimary) : l.slice(0, 2)))) to.add(String(c.email).trim().toLowerCase())
            if (e.leadId) { const l = await prisma.crmLead.findUnique({ where: { id: e.leadId }, select: { email: true } }); if (l?.email) to.add(String(l.email).trim().toLowerCase()) }
            const slug = e.meetingUrl ? e.reminderTemplate || 'event-reminder' : 'event-reminder-nolink'
            const data = { event_title: e.title, event_date: when.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), event_time: when.toISOString().slice(11, 16) + ' UTC', event_location: e.location || '', meeting_link: e.meetingUrl || '', event_description: e.description || '' }
            for (const addr of [...to].filter((x) => EMAIL.test(x))) { const r = await sendTemplate({ slug, to: addr, data, relType: 'event', relId: e.id }); if (r.sent) mailed++; else lines.push(`! Reminder of “${e.title}” to ${addr}: ${r.error}`) }
        }
        lines.push(`Reminder of the event “${e.title}” sent (${staff.length} team${e.remindClient ? `, ${mailed} email(s) to the client side` : ''})`)
    }
}
