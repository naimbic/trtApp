import { readSettings } from '@/lib/crm/appSettings'
import { config, windowState, workStart } from '@/lib/crm/notifyHours'

let cache = { at: 0, v: null }
const KEYS = ['notify_hours_on', 'notify_hours_from', 'notify_hours_to', 'work_hours_from', 'work_hours_to', 'default_timezone']

/** The notification hours and the working day from the settings (kept 20 seconds), with the company time zone. */
export async function notifyHours() {
    if (cache.v && Date.now() - cache.at < 20000) return cache.v
    const S = await readSettings(KEYS)
    let tz = S.get('default_timezone') || 'Africa/Casablanca'
    try { new Intl.DateTimeFormat('en', { timeZone: tz }) } catch { tz = 'Africa/Casablanca' }
    const v = { ...config({ on: S.get('notify_hours_on'), from: S.get('notify_hours_from'), to: S.get('notify_hours_to'), workFrom: S.get('work_hours_from'), workTo: S.get('work_hours_to') }), tz }
    cache = { at: Date.now(), v }
    return v
}
export const forgetNotifyHours = () => { cache = { at: 0, v: null } }

/** { open, nextOpen } now, in the company time zone. */
export async function windowOpen(now = Date.now()) {
    const c = await notifyHours()
    return windowState({ now, tz: c.tz, cfg: c })
}

/** When the working day of today started (ms): what the bell shows for "due today" items instead of midnight. */
export async function workDayStart(now = Date.now()) {
    const c = await notifyHours()
    return workStart(c.tz, now, c)
}
