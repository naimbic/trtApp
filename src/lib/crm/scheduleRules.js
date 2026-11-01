// When the next one goes out. Pure (no database): the repeat rules of the scheduled chat messages.
export const REPEATS = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'custom']
export const UNITS = ['day', 'week', 'month', 'year']
const DAY = 86400000

/** Adds k months to d (UTC), keeping the day of the month or the last day of a shorter month. */
function addMonths(d, k) {
    const x = new Date(d)
    const day = x.getUTCDate()
    const n = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + k, 1, x.getUTCHours(), x.getUTCMinutes(), x.getUTCSeconds()))
    const last = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate()
    n.setUTCDate(Math.min(day, last))
    return n
}

/** "every N days / weeks / months / years", N from 1 to 365. */
export const customOf = (o = {}) => ({ every: Math.min(365, Math.max(1, Math.floor(Number(o.every)) || 1)), unit: UNITS.includes(o.unit) ? o.unit : 'day' })

/** One step after `d` for the repeat rule (UTC). `o` = { every, unit } for a custom rule. */
export function step(d, repeat, o = {}) {
    const x = new Date(d)
    if (repeat === 'daily') return new Date(+x + DAY)
    if (repeat === 'weekly') return new Date(+x + 7 * DAY)
    if (repeat === 'weekdays') { let n = new Date(+x + DAY); while ([0, 6].includes(n.getUTCDay())) n = new Date(+n + DAY); return n }
    if (repeat === 'monthly') return addMonths(x, 1)
    if (repeat === 'custom') {
        const { every, unit } = customOf(o)
        return unit === 'day' ? new Date(+x + every * DAY) : unit === 'week' ? new Date(+x + 7 * every * DAY) : addMonths(x, unit === 'year' ? 12 * every : every)
    }
    return null
}

/** The next moment strictly after `now` that follows `from` by the repeat rule; null for a message that does not repeat. A server that was off for days sends once and skips what it missed. */
export function nextAfter(from, repeat, now = new Date(), o = {}) {
    if (!repeat || repeat === 'none') return null
    let n = step(from, repeat, o), guard = 0
    while (n && n <= now && guard++ < 5000) n = step(n, repeat, o)
    return n
}

export function describe(repeat, o = {}, cycles = 0) {
    const base = repeat === 'custom' ? (() => { const c = customOf(o); return `Every ${c.every} ${c.unit}${c.every > 1 ? 's' : ''}` })() : ({ none: 'Once', daily: 'Every day', weekdays: 'Every weekday (Mon to Fri)', weekly: 'Every week', monthly: 'Every month' }[repeat] || repeat)
    return cycles > 0 && repeat !== 'none' ? `${base}, ${cycles} time${cycles > 1 ? 's' : ''}` : base
}
