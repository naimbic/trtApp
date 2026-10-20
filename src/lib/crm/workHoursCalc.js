// Work hours: how long each member really works in the CRM, against the company's working week.
// Pure functions (no database) so they can be tested.

export const DEFAULT_SCHEDULE = { start: '09:00', hours: [0, 8, 8, 8, 8, 8, 4], lateAfterMin: 15 } // index 0 = Sunday
export const MIN_WORK_SECONDS = 15 * 60 // a day with less than this does not count as a day worked

/** The date as the company clock shows it: day key, minutes since midnight, day of the week (0 = Sunday). */
export function localParts(date, tz) {
    let parts
    try {
        parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date))
    } catch {
        parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date))
    }
    const v = Object.fromEntries(parts.map((p) => [p.type, p.value]))
    const key = `${v.year}-${v.month}-${v.day}`
    return { key, minutes: (+v.hour % 24) * 60 + +v.minute, dow: new Date(`${key}T12:00:00Z`).getUTCDay() }
}

export const toMinutes = (hhmm, fb = 540) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim()); return m ? Math.min(1439, +m[1] * 60 + +m[2]) : fb }
export const fmtMinutes = (m) => (m === null || m === undefined ? '' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`)

/** Day keys from `from` to `to` (inclusive, YYYY-MM-DD). */
export function dayKeys(from, to) {
    const out = []
    for (let t = +new Date(`${from}T12:00:00Z`); t <= +new Date(`${to}T12:00:00Z`) && out.length < 400; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10))
    return out
}

export const expectedHours = (key, schedule) => Number(schedule.hours[new Date(`${key}T12:00:00Z`).getUTCDay()]) || 0

/** Seconds a heartbeat adds: the time since the last one, or one interval when the member was away for longer. */
export const pingSeconds = (gapMs, interval = 60) => (gapMs > 0 && gapMs <= 150000 ? Math.round(gapMs / 1000) : interval)

/**
 * One member over a range. days = rows { day, firstSeen, lastSeen, activeSeconds }; today = key of today (days after it are not counted).
 * Returns the day by day list and the totals: active and expected hours, overtime, days worked, late days, average first / last time.
 */
export function summarize(days, schedule, from, to, tz, today = to) {
    const byDay = Object.fromEntries(days.map((d) => [d.day, d]))
    const start = toMinutes(schedule.start)
    const rows = []
    let active = 0, expected = 0, overtime = 0, worked = 0, late = 0, firstSum = 0, lastSum = 0
    for (const key of dayKeys(from, to)) {
        const d = byDay[key]
        const exp = expectedHours(key, schedule)
        const hours = d ? d.activeSeconds / 3600 : 0
        const first = d ? localParts(d.firstSeen, tz).minutes : null
        const last = d ? localParts(d.lastSeen, tz).minutes : null
        const counted = d && d.activeSeconds >= MIN_WORK_SECONDS
        const isLate = !!counted && exp > 0 && first > start + (schedule.lateAfterMin ?? 15)
        if (key <= today) expected += exp
        active += hours
        overtime += Math.max(0, hours - exp)
        if (counted) { worked++; firstSum += first; lastSum += last; if (isLate) late++ }
        rows.push({ day: key, expected: exp, hours: Math.round(hours * 100) / 100, firstSeen: d?.firstSeen || null, lastSeen: d?.lastSeen || null, first, last, late: isLate })
    }
    const r2 = (n) => Math.round(n * 100) / 100
    return {
        rows,
        totals: { active: r2(active), expected: r2(expected), ratio: expected > 0 ? Math.round((active / expected) * 100) : null, overtime: r2(overtime), worked, late, avgFirst: worked ? Math.round(firstSum / worked) : null, avgLast: worked ? Math.round(lastSum / worked) : null },
    }
}
