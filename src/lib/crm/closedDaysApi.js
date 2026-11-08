import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { readSettings } from '@/lib/crm/appSettings'
import { cleanPeriod, blocksFor, todayIn } from '@/lib/crm/closedDays'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)

const intList = (v, lo, hi) => [...new Set(String(v || '').split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n >= lo && n <= hi))]
/** Everything the booking page needs to know: the company time zone, bookable weekdays and hours, the length of a meeting, notice, how far ahead, closed months. */
export async function bookingRules() {
    const S = await readSettings(['default_timezone', 'appointment_min_notice_days', 'booking_schedule', 'booking_days', 'booking_windows', 'booking_slot_minutes', 'booking_horizon_days'])
    let tz = S.get('default_timezone') || 'Africa/Casablanca'
    try { new Intl.DateTimeFormat('en', { timeZone: tz }) } catch { tz = 'Africa/Casablanca' }
    const parseWindows = (str) => String(str || '').replace(/\s+/g, '').split(',').map((w) => w.split('-').map(Number)).filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b) && a < b && a >= 0 && b <= 24)
    // the weekly schedule (Settings → Calendar); without one, the older "days" and "hours" settings apply to every bookable day
    const schedule = {}
    try {
        const raw = JSON.parse(S.get('booking_schedule') || '{}')
        for (const d of intList(Object.keys(raw).join(','), 0, 6)) { const w = parseWindows(raw[d]?.windows); if (w.length) schedule[d] = { windows: w, staff: (Array.isArray(raw[d].staff) ? raw[d].staff : []).filter((i) => /^[a-f0-9]{24}$/i.test(String(i))), slot: [30, 45, 60, 90, 120].includes(Number(raw[d].slot)) ? Number(raw[d].slot) : null } }
    } catch { /* not valid: use the older settings */ }
    if (!Object.keys(schedule).length) {
        const w = parseWindows(S.get('booking_windows') || '10-13,14-17')
        for (const d of intList(S.get('booking_days') || '2,4', 0, 6)) schedule[d] = { windows: w.length ? w : [[10, 13], [14, 17]], staff: [], slot: null }
    }
    if (!Object.keys(schedule).length) for (const d of [2, 4]) schedule[d] = { windows: [[10, 13], [14, 17]], staff: [], slot: null }
    const days = Object.keys(schedule).map(Number)
    const windows = schedule[days[0]].windows
    const slot = Number(S.get('booking_slot_minutes')) || 60
    return {
        tz, minNoticeDays: Math.min(30, Math.max(0, S.num('appointment_min_notice_days', 2))),
        days, windows, schedule, slotMinutes: [30, 45, 60, 90, 120].includes(slot) ? slot : 60,
        horizonDays: Math.min(365, Math.max(7, S.num('booking_horizon_days', 56)))
    }
}

// Closed days and company days off are ONE list (the Days off of the More menu): a closed period is just several days off in a row.
const dayStr = (d) => new Date(d).toISOString().slice(0, 10)
const addDays = (str, n) => dayStr(+new Date(`${str}T00:00:00Z`) + n * 86400000)
/** Closing days works for whoever manages days off (Attendance & leave) or may close days for appointments. */
async function allowed(cap) {
    try { return await requirePermission('leave', cap) } catch (e) { try { return await requirePermission('calendar', 'close_days') } catch { throw e } }
}

/** The days off still to come (today included), soonest first. */
export async function listClosed() {
    await requirePermission('calendar', 'view')
    const { tz, minNoticeDays } = await bookingRules()
    const today = todayIn(tz)
    const rows = await prisma.crmDayOff.findMany({ where: { offDate: { gte: new Date(`${today}T00:00:00Z`) } }, orderBy: { offDate: 'asc' }, take: 1000 })
    let can = false
    try { await allowed('create'); can = true } catch { /* view only */ }
    return { list: rows.filter((r) => r.offDate).map((r) => ({ id: r.id, date: dayStr(r.offDate), reason: r.reason || '' })), can: { edit: can }, minNoticeDays, tz, today }
}

/** Close a period (one day or several): one day off per day, the days already off are kept. */
export async function addClosed(body = {}) {
    await allowed('create')
    const p = cleanPeriod(body.fromDay || body.from, body.toDay || body.to)
    if (p.error) throw fail(p.error)
    const reason = String(body.label ?? body.reason ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || null
    const have = new Set((await prisma.crmDayOff.findMany({ where: { offDate: { gte: new Date(`${p.fromDay}T00:00:00Z`), lte: new Date(`${p.toDay}T00:00:00Z`) } }, select: { offDate: true } })).map((r) => dayStr(r.offDate)))
    const data = []
    for (let d = p.fromDay; d <= p.toDay; d = addDays(d, 1)) if (!have.has(d)) data.push({ offDate: new Date(`${d}T00:00:00Z`), reason })
    if (data.length) await prisma.crmDayOff.createMany({ data })
    return { added: data.length, fromDay: p.fromDay, toDay: p.toDay }
}

export async function removeClosed(id) {
    await allowed('delete')
    if (!oid(id) || !(await prisma.crmDayOff.findUnique({ where: { id }, select: { id: true } }))) throw fail('Day off not found', 404)
    await prisma.crmDayOff.delete({ where: { id } })
    return { success: true }
}

/** What the booking page must not offer between from and to: the closed periods and the minimum notice, as busy blocks (the same shape as an event). */
export async function closedBlocks(from, to) {
    const rules = await bookingRules()
    const { tz, minNoticeDays } = rules
    const lo = todayIn(tz, +new Date(from) - 86400000), hi = todayIn(tz, +new Date(to) + 86400000)
    const rows = await prisma.crmDayOff.findMany({ where: { offDate: { gte: new Date(`${lo}T00:00:00Z`), lte: new Date(`${hi}T00:00:00Z`) } }, orderBy: { offDate: 'asc' }, take: 1000 })
    const closed = [] // days in a row become one period
    for (const r of rows) {
        if (!r.offDate) continue
        const d = dayStr(r.offDate), last = closed[closed.length - 1]
        if (last && (last.toDay === d || addDays(last.toDay, 1) === d)) last.toDay = d
        else closed.push({ fromDay: d, toDay: d, label: r.reason || '' })
    }
    return { blocks: blocksFor({ closed, minNoticeDays, tz, from, to }).map((b, i) => ({ id: `closed-${i}`, start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString(), all_day: false, status: b.status === 'notice' ? 'notice' : 'closed', staff_ids: [] })), rules: { min_notice_days: minNoticeDays, tz, days: rules.days, windows: rules.windows, schedule: rules.schedule, slot_minutes: rules.slotMinutes, horizon_days: rules.horizonDays } }
}
