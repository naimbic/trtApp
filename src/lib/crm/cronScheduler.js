import { getOptions } from '@/lib/crm/mailer'
import { runCron } from '@/lib/crm/cron'
import { isDue, normalizeSchedule } from '@/lib/crm/cronSchedule'

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
    const t = setInterval(() => { schedulerTick().catch((e) => console.warn('[cron-scheduler]', String(e.message || e).slice(0, 160))) }, 20000)
    t.unref?.()
    globalThis.__trtCronScheduler = t
}
