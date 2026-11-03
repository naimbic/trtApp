// When the CRM may disturb people (push, Telegram / WhatsApp, reminder emails) and when its day starts. No database, no clock of its own: tested on its own.
import { startOfDayUtc, parseDay, todayIn } from './closedDays.js'

export const DEFAULTS = { on: true, from: 10, to: 17, workFrom: 9, workTo: 18 }
const int = (v, d, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) && String(v ?? '') !== '' ? Math.min(hi, Math.max(lo, n)) : d }

/** The settings (strings, or nothing) as safe numbers: the window ends after it starts, the working day too. */
export function config(raw = {}) {
    const from = int(raw.from, DEFAULTS.from, 0, 23)
    const to = Math.max(from + 1, int(raw.to, DEFAULTS.to, 1, 24))
    const workFrom = int(raw.workFrom, DEFAULTS.workFrom, 0, 23)
    const workTo = Math.max(workFrom + 1, int(raw.workTo, DEFAULTS.workTo, 1, 24))
    return { on: raw.on === undefined ? DEFAULTS.on : !(raw.on === false || raw.on === '0' || raw.on === 0), from, to, workFrom, workTo }
}

/** The hour (0-23) it is in `tz`. */
export const hourIn = (tz, now = Date.now()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)))

/** The UTC instant of `hour:00` on the local day `ymd` of `tz`. */
export function atHour(ymd, hour, tz) {
    const d = parseDay(ymd)
    return startOfDayUtc(d.y, d.m, d.d, tz) + hour * 3600000
}

/** { open, nextOpen } : is it inside the notification hours in `tz`, and when do they open next (ms). */
export function windowState({ now = Date.now(), tz = 'UTC', cfg = DEFAULTS } = {}) {
    if (!cfg.on) return { open: true, nextOpen: now }
    const h = hourIn(tz, now)
    if (h >= cfg.from && h < cfg.to) return { open: true, nextOpen: now }
    const today = todayIn(tz, now)
    const tomorrow = todayIn(tz, now + 86400000)
    return { open: false, nextOpen: h < cfg.from ? atHour(today, cfg.from, tz) : atHour(tomorrow, cfg.from, tz) }
}

/** When the working day of `now`'s local date starts (ms). */
export const workStart = (tz, now = Date.now(), cfg = DEFAULTS) => atHour(todayIn(tz, now), cfg.workFrom, tz)
