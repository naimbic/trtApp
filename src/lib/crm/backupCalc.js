// Backup file names and which old ones to delete. No database, no clock of its own: tested on its own.
const DAY = 86400000
export const PREFIX = 'backups/'
const pad = (n) => String(n).padStart(2, '0')
export const ymdOf = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` }
export const backupKey = (ms) => `${PREFIX}trtcrm-${ymdOf(ms)}.ndjson.gz`
/** The day (UTC midnight, ms) a backup file is for, or null when the key is not one of ours. */
export const backupDay = (key) => { const m = /trtcrm-(\d{4})-(\d{2})-(\d{2})\.ndjson\.gz$/.exec(String(key || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null }

/**
 * Keys to delete: everything older than `keepDays` days, except one backup a week (the Sunday ones) kept for `keepWeeks` weeks.
 * Files that are not ours are never touched.
 */
export function pickDeletes(keys, nowMs, { keepDays = 14, keepWeeks = 12 } = {}) {
    const today = Date.UTC(new Date(nowMs).getUTCFullYear(), new Date(nowMs).getUTCMonth(), new Date(nowMs).getUTCDate())
    return keys.filter((k) => {
        const d = backupDay(k)
        if (d === null) return false
        const age = Math.floor((today - d) / DAY)
        if (age <= keepDays) return false
        return !(new Date(d).getUTCDay() === 0 && age <= keepWeeks * 7)
    })
}

/** True when the last good backup is older than `hours` (or there never was one). */
export const backupLate = (lastOkMs, nowMs, hours = 36) => !lastOkMs || nowMs - lastOkMs > hours * 3600000
