// Daily backup of the whole database to the file storage (DigitalOcean Spaces): streamed there while it is read (the server never holds the file),
// and downloaded straight from the storage with a short-lived link (the file never goes through the server). Kept 14 days + one a week for 12 weeks.
// Every collection is read in batches and written as one gzip file of lines { c: collection, d: document } (extended JSON, so
// ids and dates survive). It runs by itself once a day after 02:00 company time, whether the cron job is on or not, and can be run by hand.
import zlib from 'node:zlib'
import { ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import prisma from '@/lib/prisma'
import spaces, { BUCKET } from '@/lib/spaces'
import { getOptions, setOptions } from '@/lib/crm/mailer'
import { alertAdmins } from '@/lib/crm/alerts'
import { PREFIX, backupKey, backupDay, pickDeletes, backupLate, ymdOf } from '@/lib/crm/backupCalc'

const storageReady = () => !!(BUCKET && process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET)

/** Reads every document of every collection into the gzip stream `gz`; returns { collections: { name: count }, docs }. */
async function writeDump(gz) {
    const list = await prisma.$runCommandRaw({ listCollections: 1, nameOnly: true })
    const names = (list.cursor?.firstBatch || []).filter((c) => c.type !== 'view' && !c.name.startsWith('system.')).map((c) => c.name).sort()
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
    return { collections: counts, docs }
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
            const gz = zlib.createGzip({ level: 6 })
            const key = backupKey(Date.now())
            const upload = new Upload({ client: spaces, params: { Bucket: BUCKET, Key: key, Body: gz, ContentType: 'application/gzip', Metadata: { reason } }, queueSize: 2, partSize: 8 * 1048576 })
            const [{ collections, docs }] = await Promise.all([writeDump(gz).catch((e) => { gz.destroy(e); throw e }), upload.done()])
            const head = (await listBackups()).find((b) => b.key === key)
            const bytes = head?.size || 0
            const all = await listBackups()
            const gone = pickDeletes(all.map((b) => b.key), Date.now())
            if (gone.length) await spaces.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: gone.map((Key) => ({ Key })) } }))
            await setOptions({ backup_last_ok: Date.now(), backup_last_info: `${key.slice(PREFIX.length)} · ${docs} documents · ${(bytes / 1048576).toFixed(1)} MB · ${Math.round((Date.now() - t0) / 1000)} s`, backup_last_error: '' })
            return { ok: true, name: key.slice(PREFIX.length), size: bytes, docs, collections: Object.keys(collections).length }
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

/** A link (valid 5 minutes) that downloads one backup straight from the file storage. */
export async function backupLink(name) {
    if (!/^trtcrm-\d{4}-\d{2}-\d{2}\.ndjson\.gz$/.test(name)) throw Object.assign(new Error('Backup not found'), { status: 404 })
    return getSignedUrl(spaces, new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}${name}`, ResponseContentDisposition: `attachment; filename="${name}"` }), { expiresIn: 300 })
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
