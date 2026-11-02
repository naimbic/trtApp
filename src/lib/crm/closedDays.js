// Days the team does not take appointments (holidays, out of office) and the minimum notice, as busy blocks for the booking page.
// No database, no clock of its own: tested on its own.
const DAY = 86400000
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseDay(s) {
    const m = DAY_RE.exec(String(s ?? ''))
    if (!m) return null
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const t = new Date(Date.UTC(y, mo - 1, d))
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y, m: mo, d, t: +t } : null
}
export const fmtDay = (t) => new Date(t).toISOString().slice(0, 10)

function offsetMs(utcMs, tz) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(utcMs))
    const get = (t) => Number(parts.find((p) => p.type === t).value)
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - utcMs
}
/** The UTC instant at which the clock in `tz` reads 00:00 of the day y-m-d. */
export function startOfDayUtc(y, m, d, tz) {
    const guess = Date.UTC(y, m - 1, d)
    return guess - offsetMs(guess - offsetMs(guess, tz), tz)
}
/** Today's date in `tz` as YYYY-MM-DD. */
export const todayIn = (tz, now = Date.now()) => fmtDay(now + offsetMs(now, tz))

/** A closed period as written by a person: valid dates, from <= to, at most a year. Returns { fromDay, toDay } or { error }. */
export function cleanPeriod(from, to) {
    const a = parseDay(from), b = parseDay(to || from)
    if (!a || !b) return { error: 'Choose real dates (YYYY-MM-DD)' }
    if (b.t < a.t) return { error: 'The last day cannot be before the first day' }
    if ((b.t - a.t) / DAY > 365) return { error: 'A closed period lasts a year at most' }
    return { fromDay: fmtDay(a.t), toDay: fmtDay(b.t) }
}

/**
 * What the booking page must not offer between `from` and `to` (Date or ms): one block per closed period, and a block from now up to the start of the first bookable day
 * (minNoticeDays 2 = today and tomorrow cannot be booked). Each block is { start, end, status, label }, times in ms (UTC), cut to the asked range.
 */
export function blocksFor({ closed = [], minNoticeDays = 0, tz = 'UTC', from, to, now = Date.now() }) {
    const lo = +new Date(from), hi = +new Date(to)
    const out = []
    const add = (start, end, status, label = '') => { const s = Math.max(start, lo), e = Math.min(end, hi); if (e > s) out.push({ start: s, end: e, status, label }) }
    const n = Math.max(0, Math.min(60, Math.round(Number(minNoticeDays) || 0)))
    if (n > 0) {
        const today = parseDay(todayIn(tz, now))
        const first = parseDay(fmtDay(today.t + n * DAY))
        add(now, startOfDayUtc(first.y, first.m, first.d, tz), 'notice')
    }
    for (const c of closed) {
        const a = parseDay(c.fromDay), b = parseDay(c.toDay || c.fromDay)
        if (!a || !b || b.t < a.t) continue
        const next = parseDay(fmtDay(b.t + DAY))
        add(startOfDayUtc(a.y, a.m, a.d, tz), startOfDayUtc(next.y, next.m, next.d, tz), 'closed', c.label || '')
    }
    return out
}
