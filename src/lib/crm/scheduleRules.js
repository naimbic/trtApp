// When the next one goes out. Pure (no database): the repeat rules of the scheduled chat messages.
export const REPEATS = ['none', 'daily', 'weekdays', 'weekly', 'monthly']
const DAY = 86400000

/** One step after `d` for the repeat rule (UTC; monthly keeps the day of the month, or the last day of a shorter month). */
export function step(d, repeat) {
    const x = new Date(d)
    if (repeat === 'daily') return new Date(+x + DAY)
    if (repeat === 'weekly') return new Date(+x + 7 * DAY)
    if (repeat === 'weekdays') { let n = new Date(+x + DAY); while ([0, 6].includes(n.getUTCDay())) n = new Date(+n + DAY); return n }
    if (repeat === 'monthly') {
        const day = x.getUTCDate()
        const n = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 1, x.getUTCHours(), x.getUTCMinutes(), x.getUTCSeconds()))
        const last = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate()
        n.setUTCDate(Math.min(day, last))
        return n
    }
    return null
}

/** The next moment strictly after `now` that follows `from` by the repeat rule; null for a message that does not repeat. A server that was off for days sends once and skips what it missed. */
export function nextAfter(from, repeat, now = new Date()) {
    if (!repeat || repeat === 'none') return null
    let n = step(from, repeat), guard = 0
    while (n && n <= now && guard++ < 5000) n = step(n, repeat)
    return n
}

export const describe = (repeat) => ({ none: 'Once', daily: 'Every day', weekdays: 'Every weekday (Mon to Fri)', weekly: 'Every week', monthly: 'Every month' }[repeat] || repeat)
