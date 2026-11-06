import { getOptions } from '@/lib/crm/mailer'
import { runCron } from '@/lib/crm/cron'
import { isDue, normalizeSchedule } from '@/lib/crm/cronSchedule'
import { backupTick } from '@/lib/crm/backup'
import { alertAdmins } from '@/lib/crm/alerts'

const KEYS = ['cron_enabled', 'cron_mode', 'cron_every', 'cron_unit', 'cron_at_hour', 'last_cron_run', 'default_timezone']
const localHour = (tz) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', hour: '2-digit', hour12: false }).format(new Date())) % 24

/** One look at the settings: runs the automatic tasks if the built-in scheduler is chosen, switched on and its time has come. */
export async function schedulerTick(now = Date.now()) {
    const o = await getOptions(KEYS)
    if (o('cron_enabled') !== '1' || o('cron_mode', 'external') !== 'built_in') return false
    const schedule = normalizeSchedule({ every: o('cron_every'), unit: o('cron_unit'), atHour: o('cron_at_hour') })
    const lastRunMs = (Number(o('last_cron_run')) || 0) * 1000
    if (!isDue(schedule, { lastRunMs, nowMs: now, hour: localHour(o('default_timezone')) })) return false
    await runCron({ trigger: 'scheduler' })
    return true
}

/** Started once at boot: checks every 20 seconds (cheap: one settings read) and runs the tasks when they are due. */
export function startCronScheduler() {
    if (globalThis.__trtCronScheduler) return
    // every 10 minutes: the daily backup, and the watchdog (the cron job must have run lately when it is switched on)
    const w = setInterval(() => { watchdogTick().catch((e) => console.warn('[watchdog]', String(e.message || e).slice(0, 160))) }, 600000)
    w.unref?.()
    setTimeout(() => { watchdogTick().catch(() => {}) }, 60000).unref?.()
    const t = setInterval(() => { schedulerTick().catch((e) => console.warn('[cron-scheduler]', String(e.message || e).slice(0, 160))) }, 20000)
    t.unref?.()
    globalThis.__trtCronScheduler = t
}

/** The daily backup, and an alert when the automatic tasks switched on have not run for 6 hours. */
export async function watchdogTick(now = Date.now()) {
    await backupTick()
    const o = await getOptions(['cron_enabled', 'last_cron_run'])
    const last = (Number(o('last_cron_run')) || 0) * 1000
    if (o('cron_enabled') === '1' && last && now - last > 6 * 3600000) await alertAdmins({ key: 'cron-stale', title: 'The automatic tasks have stopped', text: 'The cron job is switched on but has not run for more than 6 hours: reminders, recurring invoices and lead emails are waiting. Check the scheduler (Settings → Cron job).', everyMinutes: 720 })
}
