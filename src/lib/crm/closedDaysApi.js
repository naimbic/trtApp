import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { readSettings } from '@/lib/crm/appSettings'
import { cleanPeriod, blocksFor, todayIn } from '@/lib/crm/closedDays'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const MAX = 200

/** The company time zone and the minimum notice (days) the booking page must respect. */
export async function bookingRules() {
    const S = await readSettings(['default_timezone', 'appointment_min_notice_days'])
    const tz = S.get('default_timezone') || 'Africa/Casablanca'
    try { new Intl.DateTimeFormat('en', { timeZone: tz }) } catch { return { tz: 'Africa/Casablanca', minNoticeDays: Math.max(0, S.num('appointment_min_notice_days', 2)) } }
    return { tz, minNoticeDays: Math.min(30, Math.max(0, S.num('appointment_min_notice_days', 2))) }
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
    const { tz, minNoticeDays } = await bookingRules()
    const closed = await prisma.crmClosedDay.findMany({ where: { toDay: { gte: todayIn(tz, +new Date(from) - 86400000) }, fromDay: { lte: todayIn(tz, +new Date(to) + 86400000) } }, take: MAX })
    return { blocks: blocksFor({ closed, minNoticeDays, tz, from, to }).map((b, i) => ({ id: `closed-${i}`, start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString(), all_day: false, status: b.status === 'notice' ? 'notice' : 'closed', staff_ids: [] })), rules: { min_notice_days: minNoticeDays, tz } }
}
