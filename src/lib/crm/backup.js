// Daily backup of the whole database to the file storage (DigitalOcean Spaces), kept 14 days + one a week for 12 weeks.
// Every collection is read in batches and written as one gzip file of lines { c: collection, d: document } (extended JSON, so
// ids and dates survive). It runs by itself once a day after 02:00 company time, whether the cron job is on or not, and can be run by hand.
import zlib from 'node:zlib'
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import prisma from '@/lib/prisma'
import spaces, { BUCKET } from '@/lib/spaces'
import { getOptions, setOptions } from '@/lib/crm/mailer'
import { alertAdmins } from '@/lib/crm/alerts'
import { PREFIX, backupKey, backupDay, pickDeletes, backupLate, ymdOf } from '@/lib/crm/backupCalc'

const storageReady = () => !!(BUCKET && process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET)

/** Every document of every collection, gzip-compressed: { buffer, collections: { name: count }, docs }. */
export async function dumpDatabase() {
    const list = await prisma.$runCommandRaw({ listCollections: 1, nameOnly: true })
    const names = (list.cursor?.firstBatch || []).filter((c) => c.type !== 'view' && !c.name.startsWith('system.')).map((c) => c.name).sort()
    const gz = zlib.createGzip({ level: 6 })
    const chunks = []
    gz.on('data', (c) => chunks.push(c))
    const done = new Promise((res, rej) => { gz.on('end', res); gz.on('error', rej) })
    const counts = {}
    let docs = 0
    const write = (obj) => new Promise((res) => { if (gz.write(`${JSON.stringify(obj)}\n`)) res(); else gz.once('drain', res) })
    await write({ meta: { app: 'trtcrm', at: new Date().toISOString(), collections: names } })
    for (const name of names) {
        counts[name] = 0
        // paged by _id, no cursor (a cursor does not survive between two raw commands of the connection pool)
        let last = null
        for (;;) {
            const r = await prisma.$runCommandRaw({ find: name, filter: last === null ? {} : { _id: { $gt: last } }, sort: { _id: 1 }, limit: 500, singleBatch: true })
            const batch = r.cursor?.firstBatch || []
            for (const d of batch) { await write({ c: name, d }); counts[name]++; docs++ }
            if (batch.length < 500) break
            last = batch[batch.length - 1]._id
        }
    }
    gz.end()
    await done
    return { buffer: Buffer.concat(chunks), collections: counts, docs }
}

export async function listBackups() {
    if (!storageReady()) return []
    const out = []
    let token
    do {
        const r = await spaces.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token }))
        for (const o of r.Contents || []) if (backupDay(o.Key) !== null) out.push({ key: o.Key, name: o.Key.slice(PREFIX.length), size: o.Size, at: o.LastModified })
        token = r.IsTruncated ? r.NextContinuationToken : undefined
    } while (token)
    return out.sort((a, b) => b.key.localeCompare(a.key))
}

let running = null
/** One backup now (a second call while one runs waits for the same one). Returns { ok, name, size, docs, error }. */
export function runBackup({ reason = 'schedule' } = {}) {
    running ??= (async () => {
        const t0 = Date.now()
        try {
            if (!storageReady()) throw new Error('The file storage (DigitalOcean Spaces) is not set up, so there is nowhere to put the backup')
            await setOptions({ backup_last_try: Date.now() })
            const { buffer, collections, docs } = await dumpDatabase()
            const key = backupKey(Date.now())
            await spaces.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: 'application/gzip', Metadata: { docs: String(docs), collections: String(Object.keys(collections).length), reason } }))
            const all = await listBackups()
            const gone = pickDeletes(all.map((b) => b.key), Date.now())
            if (gone.length) await spaces.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: gone.map((Key) => ({ Key })) } }))
            await setOptions({ backup_last_ok: Date.now(), backup_last_info: `${key.slice(PREFIX.length)} · ${docs} documents · ${(buffer.length / 1048576).toFixed(1)} MB · ${Math.round((Date.now() - t0) / 1000)} s`, backup_last_error: '' })
            return { ok: true, name: key.slice(PREFIX.length), size: buffer.length, docs, collections: Object.keys(collections).length }
        } catch (e) {
            const msg = String(e.message || e).slice(0, 300)
            await setOptions({ backup_last_error: msg }).catch(() => {})
            await alertAdmins({ key: 'backup-failed', title: 'The backup failed', text: msg, everyMinutes: 360 })
            return { ok: false, error: msg }
        }
    })().finally(() => { running = null })
    return running
}

export async function backupStatus() {
    const o = await getOptions(['backup_last_ok', 'backup_last_try', 'backup_last_info', 'backup_last_error', 'cron_job_backup', 'default_timezone'])
    const last = Number(o('backup_last_ok')) || 0
    return { storage: storageReady(), enabled: o('cron_job_backup', '1') !== '0', lastOk: last, lastTry: Number(o('backup_last_try')) || 0, info: o('backup_last_info'), error: o('backup_last_error'), late: storageReady() && backupLate(last, Date.now()) }
}

/** The stream of one backup file (the Backups panel downloads it). */
export async function backupStream(name) {
    const key = `${PREFIX}${name}`
    if (!/^trtcrm-\d{4}-\d{2}-\d{2}\.ndjson\.gz$/.test(name)) throw Object.assign(new Error('Backup not found'), { status: 404 })
    const r = await spaces.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    return { body: r.Body, size: r.ContentLength }
}

const localHour = (tz) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', hour: '2-digit', hour12: false }).format(new Date())) % 24
/** Looked at every few minutes: backs up once a day after 02:00 (company time), and warns when the last good backup is too old. */
export async function backupTick() {
    if (!storageReady()) return
    const o = await getOptions(['cron_job_backup', 'backup_last_ok', 'backup_last_try', 'default_timezone'])
    if (o('cron_job_backup', '1') === '0') return
    const lastOk = Number(o('backup_last_ok')) || 0, lastTry = Number(o('backup_last_try')) || 0
    const today = ymdOf(Date.now())
    if (localHour(o('default_timezone')) >= 2 && ymdOf(lastOk) !== today && Date.now() - lastTry > 3 * 3600000) await runBackup({ reason: 'schedule' })
    else if (lastOk && backupLate(lastOk, Date.now(), 36)) await alertAdmins({ key: 'backup-late', title: 'No backup for more than 36 hours', text: 'The last good backup is older than a day and a half. Open Settings → Cron job → Backups.', everyMinutes: 720 })
}
