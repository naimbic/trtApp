import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { readSettings } from '@/lib/crm/appSettings'
import { cleanPeriod, blocksFor, todayIn } from '@/lib/crm/closedDays'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const MAX = 200

const intList = (v, lo, hi) => [...new Set(String(v || '').split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n >= lo && n <= hi))]
/** Everything the booking page needs to know: the company time zone, bookable weekdays and hours, the length of a meeting, notice, how far ahead, closed months. */
export async function bookingRules() {
    const S = await readSettings(['default_timezone', 'appointment_min_notice_days', 'booking_days', 'booking_windows', 'booking_slot_minutes', 'booking_horizon_days', 'booking_closed_months'])
    let tz = S.get('default_timezone') || 'Africa/Casablanca'
    try { new Intl.DateTimeFormat('en', { timeZone: tz }) } catch { tz = 'Africa/Casablanca' }
    const days = intList(S.get('booking_days') || '2,4', 0, 6)
    const windows = String(S.get('booking_windows') || '10-13,14-17').replace(/\s+/g, '').split(',').map((w) => w.split('-').map(Number)).filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b) && a < b && a >= 0 && b <= 24)
    const slot = Number(S.get('booking_slot_minutes')) || 60
    return {
        tz, minNoticeDays: Math.min(30, Math.max(0, S.num('appointment_min_notice_days', 2))),
        days, windows: windows.length ? windows : [[10, 13], [14, 17]], slotMinutes: [30, 45, 60, 90, 120].includes(slot) ? slot : 60,
        horizonDays: Math.min(365, Math.max(7, S.num('booking_horizon_days', 56))), closedMonths: intList(S.get('booking_closed_months'), 1, 12),
    }
}

/** Closed periods that still matter (those not over yet), soonest first. */
export async function listClosed() {
    const session = await requirePermission('calendar', 'view')
    const { tz, minNoticeDays } = await bookingRules()
    const today = todayIn(tz)
    const rows = await prisma.crmClosedDay.findMany({ where: { toDay: { gte: today } }, orderBy: { fromDay: 'asc' }, take: MAX })
    let can = false
    try { await requirePermission('calendar', 'close_days'); can = true } catch { /* view only */ }
    void session
    return { list: rows.map((r) => ({ id: r.id, fromDay: r.fromDay, toDay: r.toDay, label: r.label || '' })), can: { edit: can }, minNoticeDays, tz, today }
}

export async function addClosed(body = {}) {
    const session = await requirePermission('calendar', 'close_days')
    const p = cleanPeriod(body.fromDay || body.from, body.toDay || body.to)
    if (p.error) throw fail(p.error)
    const { tz } = await bookingRules()
    if (p.toDay < todayIn(tz)) throw fail('This period is already over')
    if ((await prisma.crmClosedDay.count({ where: { toDay: { gte: todayIn(tz) } } })) >= MAX) throw fail(`At most ${MAX} closed periods at a time: remove the old ones`)
    const row = await prisma.crmClosedDay.create({ data: { ...p, label: String(body.label || '').replace(/\s+/g, ' ').trim().slice(0, 80) || null, createdBy: (await getStaffId(session)) || undefined } })
    return { id: row.id, fromDay: row.fromDay, toDay: row.toDay, label: row.label || '' }
}

export async function removeClosed(id) {
    await requirePermission('calendar', 'close_days')
    if (!oid(id) || !(await prisma.crmClosedDay.findUnique({ where: { id }, select: { id: true } }))) throw fail('Closed period not found', 404)
    await prisma.crmClosedDay.delete({ where: { id } })
    return { success: true }
}

/** What the booking page must not offer between from and to: the closed periods and the minimum notice, as busy blocks (the same shape as an event). */
export async function closedBlocks(from, to) {
    const rules = await bookingRules()
    const { tz, minNoticeDays } = rules
    const closed = await prisma.crmClosedDay.findMany({ where: { toDay: { gte: todayIn(tz, +new Date(from) - 86400000) }, fromDay: { lte: todayIn(tz, +new Date(to) + 86400000) } }, take: MAX })
    // a month closed every year is one more closed period, for each such month inside the asked range
    const first = new Date(todayIn(tz, +new Date(from)) + 'T00:00:00Z'), last = new Date(todayIn(tz, +new Date(to)) + 'T00:00:00Z')
    for (let y = first.getUTCFullYear(), m = first.getUTCMonth(); y < last.getUTCFullYear() || (y === last.getUTCFullYear() && m <= last.getUTCMonth()); m++) {
        if (m > 11) { m = 0; y++ }
        if (rules.closedMonths.includes(m + 1)) closed.push({ fromDay: `${y}-${String(m + 1).padStart(2, '0')}-01`, toDay: `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(Date.UTC(y, m + 1, 0)).getUTCDate()).padStart(2, '0')}`, label: 'Closed month' })
        if (y === last.getUTCFullYear() && m === last.getUTCMonth()) break
    }
    return { blocks: blocksFor({ closed, minNoticeDays, tz, from, to }).map((b, i) => ({ id: `closed-${i}`, start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString(), all_day: false, status: b.status === 'notice' ? 'notice' : 'closed', staff_ids: [] })), rules: { min_notice_days: minNoticeDays, tz, days: rules.days, windows: rules.windows, slot_minutes: rules.slotMinutes, horizon_days: rules.horizonDays } }
}
