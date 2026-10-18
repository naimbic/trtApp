// "Compared with the previous period" for the money figures on the lists: the records dated in the last 30 days against
// the records dated in the 30 days before, each counted with the same rule as the figure itself. Pure (no database).
const DAY = 86400000
export const TREND_DAYS = 30

/** The rows dated in the last `days` days and the rows dated in the `days` before those. */
export function inWindows(rows, dateOf, now = Date.now(), days = TREND_DAYS) {
    const a = now - days * DAY, b = now - 2 * days * DAY
    const cur = [], prev = []
    for (const r of rows) {
        const t = +new Date(dateOf(r))
        if (!t) continue
        if (t > a && t <= now) cur.push(r)
        else if (t > b && t <= a) prev.push(r)
    }
    return { cur, prev }
}

/** { days, cur, prev } where cur / prev are what `tally(rows)` makes of each window. */
export function trendOf(rows, dateOf, tally, now = Date.now(), days = TREND_DAYS) {
    const w = inWindows(rows, dateOf, now, days)
    return { days, cur: tally(w.cur), prev: tally(w.prev) }
}
