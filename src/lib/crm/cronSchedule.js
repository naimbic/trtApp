// How often the automatic tasks wake up: every N minutes, hours or days. Pure helpers (no database), used by the built-in
// scheduler, by the "crontab line" shown in Settings → Cron job, and tested on their own.
const MIN = 60000, HOUR = 3600000, DAY = 86400000
export const UNITS = ['minute', 'hour', 'day']
const LIMITS = { minute: [1, 59], hour: [1, 23], day: [1, 30] }
const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }

/** { every, unit, atHour } from the saved options (any junk becomes a sane value: every 15 minutes). */
export function normalizeSchedule({ every, unit, atHour } = {}) {
    const u = UNITS.includes(unit) ? unit : 'minute'
    const [lo, hi] = LIMITS[u]
    return { unit: u, every: clampInt(every, lo, hi, u === 'minute' ? 15 : 1), atHour: clampInt(atHour, 0, 23, 9) }
}

/** The classic five-field crontab expression for the schedule (what an external scheduler would use). */
export function crontabExpr(schedule) {
    const { every, unit, atHour } = normalizeSchedule(schedule)
    if (unit === 'minute') return every === 1 ? '* * * * *' : `*/${every} * * * *`
    if (unit === 'hour') return every === 1 ? '0 * * * *' : `0 */${every} * * *`
    return every === 1 ? `0 ${atHour} * * *` : `0 ${atHour} */${every} * *`
}

export function intervalMs(schedule) {
    const { every, unit } = normalizeSchedule(schedule)
    return every * (unit === 'minute' ? MIN : unit === 'hour' ? HOUR : DAY)
}

/** Whether a run is due now. `hour` is the local hour in the platform time zone; a day schedule waits for its hour. */
export function isDue(schedule, { lastRunMs = 0, nowMs = Date.now(), hour = 0 } = {}) {
    const s = normalizeSchedule(schedule)
    if (!lastRunMs) return s.unit !== 'day' || hour >= s.atHour
    const since = nowMs - lastRunMs
    if (s.unit === 'day') return since >= s.every * DAY - HOUR && hour >= s.atHour
    return since >= intervalMs(s) - 5000 // a few seconds of slack so a one-minute schedule is not missed by the timer
}

/** When the next run will happen at the earliest, as a Date (minute/hour schedules; a day schedule at its hour). */
export function nextRun(schedule, { lastRunMs = 0, nowMs = Date.now() } = {}) {
    const s = normalizeSchedule(schedule)
    const base = lastRunMs ? lastRunMs + intervalMs(s) : nowMs
    return new Date(Math.max(base, nowMs))
}
