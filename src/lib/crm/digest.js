// The daily summary email for the team members who chose "One summary a day" (Profile → Notifications): once a morning at the digest hour of
// the company clock, only when there is something to tell: what is new for them, tasks due or late, reminders and meetings of the day.
import prisma from '@/lib/prisma'
import { getOptions, deliver } from '@/lib/crm/mailer'
import { staffMailContext } from '@/lib/crm/notifyMail'
import { publicBase } from '@/lib/crm/shortLinks'
import { startOfDayUtc, todayIn, parseDay } from '@/lib/crm/closedDays'
import { buildDigest } from '@/lib/crm/digestCalc'

const hourIn = (tz) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date())) % 24
const hhmm = (d, tz) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(d))
const dm = (d, tz) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: '2-digit', month: 'short' }).format(new Date(d))

/** The sections of one person's summary. */
export async function sectionsFor(staffId, { tz, start, end }) {
    const [notes, assigned, reminders, events] = await Promise.all([
        prisma.crmNotification.findMany({ where: { toUserId: staffId, isRead: false, createdAt: { gte: new Date(Date.now() - 36 * 3600000) } }, orderBy: { createdAt: 'desc' }, take: 30 }),
        prisma.crmTaskAssigned.findMany({ where: { staffId }, select: { taskId: true } }),
        prisma.crmReminder.findMany({ where: { staffId, date: { gte: new Date(start), lt: new Date(end) } }, orderBy: { date: 'asc' }, take: 30 }),
        prisma.crmEvent.findMany({ where: { OR: [{ userId: staffId }, { attendeeIds: { has: staffId } }], start: { gte: new Date(start), lt: new Date(end) }, status: { not: 'declined' } }, orderBy: { start: 'asc' }, take: 30 }),
    ])
    const tasks = assigned.length ? await prisma.crmTask.findMany({ where: { id: { in: assigned.map((a) => a.taskId) }, status: { not: 5 }, dueDate: { lt: new Date(end) } }, orderBy: { dueDate: 'asc' }, take: 40, select: { id: true, name: true, dueDate: true } }) : []
    return {
        news: notes.map((n) => ({ text: n.description || '', sub: n.fromFullName || '', link: n.link || '' })),
        tasks: tasks.map((t) => ({ text: t.name, sub: dm(t.dueDate, tz), link: `/crm/tasks/${t.id}` })),
        reminders: reminders.map((r) => ({ text: r.description || '', sub: hhmm(r.date, tz) })),
        meetings: events.map((e) => ({ text: e.title, sub: hhmm(e.start, tz), link: `/calendar?event=${e.id}` })),
    }
}

/** Sends today's summaries (the ones not sent yet); returns how many went out. */
export async function sendDigests({ force = false } = {}) {
    const o = await getOptions(['digest_hour', 'default_timezone', 'companyname'])
    const tz = o('default_timezone', 'UTC')
    const hour = Math.min(23, Math.max(0, Number(o('digest_hour', '8')) || 8))
    if (!force && hourIn(tz) < hour) return 0
    const ymd = todayIn(tz)
    const day = parseDay(ymd)
    const start = startOfDayUtc(day.y, day.m, day.d, tz), end = start + 86400000
    const people = await prisma.crmStaff.findMany({ where: { active: true, emailDigest: true, email: { not: null } }, select: { id: true, email: true, notifyEmail: true, digestSentOn: true, firstName: true } })
    let sent = 0
    for (const p of people) {
        if (p.notifyEmail === false || (!force && p.digestSentOn === ymd)) continue
        try {
            const ctx = await staffMailContext(p.id)
            const d = buildDigest({ language: ctx.language, name: p.firstName || '', company: o('companyname'), base: publicBase(), sections: await sectionsFor(p.id, { tz, start, end }) })
            await prisma.crmStaff.update({ where: { id: p.id }, data: { digestSentOn: ymd } }) // once a day, also when there was nothing to tell
            if (d.empty) continue
            const r = await deliver({ to: p.email, subject: d.subject, html: d.html })
            if (r?.sent !== false) sent++
        } catch (e) { console.error('[digest]', e.message) }
    }
    return sent
}

/** One person's summary right now (the button in the profile): { sent } or { empty } when there is nothing to tell today. */
export async function sendMyDigest(staffId) {
    const o = await getOptions(['default_timezone', 'companyname'])
    const tz = o('default_timezone', 'UTC')
    const day = parseDay(todayIn(tz))
    const start = startOfDayUtc(day.y, day.m, day.d, tz), end = start + 86400000
    const p = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { email: true, firstName: true } })
    if (!p?.email) return { error: 'Your profile has no email address' }
    const ctx = await staffMailContext(staffId)
    const d = buildDigest({ language: ctx.language, name: p.firstName || '', company: o('companyname'), base: publicBase(), sections: await sectionsFor(staffId, { tz, start, end }) })
    if (d.empty) return { empty: true }
    const r = await deliver({ to: p.email, subject: d.subject, html: d.html })
    return r?.sent === false ? { error: r.error || 'The email could not be sent' } : { sent: true }
}
