import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { getOptions } from '@/lib/crm/mailer'
import { DEFAULT_SCHEDULE, localParts, pingSeconds, summarize } from '@/lib/crm/workHoursCalc'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const SCHEDULE_KEYS = ['default_timezone', 'work_start', 'work_late_after', ...DAYS.map((d) => `work_hours_${d}`)]

/** The company's working week and clock, from Settings. */
export async function getSchedule() {
    const o = await getOptions(SCHEDULE_KEYS)
    const num = (k, fb) => { const v = parseFloat(o(k)); return Number.isFinite(v) && v >= 0 && v <= 24 ? v : fb }
    return {
        tz: o('default_timezone') || process.env.TZ || 'UTC',
        schedule: { start: o('work_start') || DEFAULT_SCHEDULE.start, lateAfterMin: num('work_late_after', DEFAULT_SCHEDULE.lateAfterMin), hours: DAYS.map((d, i) => num(`work_hours_${d}`, DEFAULT_SCHEDULE.hours[i])) },
    }
}

/** Heartbeat from the open CRM of a signed-in team member who is really using it: moves "last seen" and adds the active time. */
export async function recordPing() {
    const session = await auth()
    const staffId = await getStaffId(session)
    if (!staffId) return { ok: false }
    const { tz } = await getSchedule()
    const now = new Date()
    const day = localParts(now, tz).key
    const row = await prisma.crmWorkDay.findUnique({ where: { staffId_day: { staffId, day } } })
    if (!row) {
        await prisma.crmWorkDay.create({ data: { staffId, day, firstSeen: now, lastSeen: now, activeSeconds: 0, pings: 1 } }).catch(() => {})
        return { ok: true }
    }
    const add = pingSeconds(+now - +row.lastSeen)
    await prisma.crmWorkDay.update({ where: { id: row.id }, data: { lastSeen: now, activeSeconds: { increment: add }, pings: { increment: 1 } } })
    return { ok: true }
}

const rangeOf = (from, to, tz) => {
    const today = localParts(new Date(), tz).key
    const end = /^\d{4}-\d{2}-\d{2}$/.test(to || '') ? to : today
    const start = /^\d{4}-\d{2}-\d{2}$/.test(from || '') ? from : localParts(new Date(Date.now() - 6 * 86400000), tz).key
    return { from: start <= end ? start : end, to: end, today }
}

/** Everyone's hours over a range (or one member's), ranked by active hours. */
export async function hoursReport({ from, to, staffId = null } = {}) {
    // a member may always see their own hours ('me'); everyone else's needs the Team permission
    const session = await auth()
    const mine = await getStaffId(session)
    if (staffId === 'me') { if (!mine) throw Object.assign(new Error('Unauthorized'), { status: 401 }); staffId = mine }
    if (!staffId || staffId !== mine) await requirePermission('staff', 'view')
    const { tz, schedule } = await getSchedule()
    const r = rangeOf(from, to, tz)
    const staff = await prisma.crmStaff.findMany({ where: { active: true, ...(staffId ? { id: staffId } : {}) }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true, jobTitle: true } })
    const rows = await prisma.crmWorkDay.findMany({ where: { staffId: { in: staff.map((s) => s.id) }, day: { gte: r.from, lte: r.to } } })
    const by = {}
    for (const w of rows) (by[w.staffId] ||= []).push(w)
    const people = staff.map((s) => {
        const sum = summarize(by[s.id] || [], schedule, r.from, r.to, tz, r.today)
        return { id: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email, jobTitle: s.jobTitle || '', image: s.profileImage || null, ...sum }
    }).sort((a, b) => b.totals.active - a.totals.active)
    return { from: r.from, to: r.to, today: r.today, tz, schedule, people: staffId ? people : people.map((p) => ({ ...p, rows: undefined })) }
}

/** Last time each active member used the CRM (for the Team list). */
export async function lastActiveMap() {
    const rows = await prisma.crmWorkDay.findMany({ where: { lastSeen: { gte: new Date(Date.now() - 45 * 86400000) } }, select: { staffId: true, lastSeen: true } })
    const out = {}
    for (const w of rows) if (!out[w.staffId] || w.lastSeen > out[w.staffId]) out[w.staffId] = w.lastSeen
    return out
}
