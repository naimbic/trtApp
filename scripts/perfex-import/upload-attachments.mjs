#!/usr/bin/env node
/**
 * Uploads the Perfex attachment files to the DigitalOcean Space and links them to their records as file-manager
 * attachments (CrmMedia rows with relType/relId), so they show in each record's Files tab.
 *
 *   node scripts/perfex-import/upload-attachments.mjs <data-dir>                  dry run: counts, sizes, what links, what does not
 *   node scripts/perfex-import/upload-attachments.mjs <data-dir> --apply           upload + create the rows (+ writes media-rows.json)
 *   node scripts/perfex-import/upload-attachments.mjs --rows media-rows.json       only create the rows in the current DB (for staging)
 *
 * <data-dir> holds attachments/*.blob, attachment-map.private.json and extra-attachment-map.private.json.
 * Objects go to  trtcrm/perfex/<type>/<perfex record id>/<perfex file id>-<name>  (originals, not re-encoded).
 * Re-running skips what is already uploaded / linked. DATABASE_URL and DO_SPACES_* come from .env.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

dotenv.config({ path: path.join(process.cwd(), '.env') })
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const rowsIdx = args.indexOf('--rows')
const dir = args.find((a, i) => !a.startsWith('--') && i !== rowsIdx + 1 || (rowsIdx < 0 && !a.startsWith('--')))
const prisma = new PrismaClient()

const MODEL = { customer: 'crmClient', invoice: 'crmInvoice', expense: 'crmExpense', lead: 'crmLead', task: 'crmTask', proposal: 'crmProposal', contract: 'crmContract', project: 'crmProject', ticket: 'crmTicket' }
const EXT = {
    jpg: ['image', 'image/jpeg'], jpeg: ['image', 'image/jpeg'], png: ['image', 'image/png'], gif: ['image', 'image/gif'], webp: ['image', 'image/webp'], svg: ['image', 'image/svg+xml'],
    pdf: ['pdf', 'application/pdf'], doc: ['doc', 'application/msword'], docx: ['doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    xls: ['sheet', 'application/vnd.ms-excel'], xlsx: ['sheet', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], csv: ['sheet', 'text/csv'],
    ppt: ['slides', 'application/vnd.ms-powerpoint'], pptx: ['slides', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'], txt: ['text', 'text/plain'],
    zip: ['archive', 'application/zip'], rar: ['archive', 'application/vnd.rar'], mp4: ['video', 'video/mp4'], mp3: ['audio', 'audio/mpeg'],
}
const safe = (n) => String(n || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'file'
const typeOf = (name) => EXT[(name.split('.').pop() || '').toLowerCase()] || ['other', 'application/octet-stream']

const bucket = process.env.DO_SPACES_BUCKET
const region = process.env.DO_SPACES_REGION
const cdn = `https://${bucket}.${region}.cdn.digitaloceanspaces.com`
const s3 = new S3Client({ endpoint: `https://${region}.digitaloceanspaces.com`, region, credentials: { accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET } })
const urlOf = (key) => `${cdn}/${key.split('/').map(encodeURIComponent).join('/')}`

async function createRows(rows) {
    let made = 0, had = 0
    for (const r of rows) {
        if (await prisma.crmMedia.findFirst({ where: { key: r.key, relType: r.relType, relId: r.relId }, select: { id: true } })) { had++; continue }
        await prisma.crmMedia.create({ data: { name: r.name, key: r.key, url: urlOf(r.key), mime: r.mime, kind: r.kind, size: r.size, originalSize: r.size, purpose: 'attachment', relType: r.relType, relId: r.relId, visibleToClient: !!r.visible, uploaderName: 'Perfex import' } })
        made++
    }
    return { made, had }
}

if (rowsIdx >= 0) {
    const rows = JSON.parse(fs.readFileSync(args[rowsIdx + 1], 'utf8'))
    console.log(`creating ${rows.length} file rows in the current database...`, await createRows(rows))
    await prisma.$disconnect()
    process.exit(0)
}

if (!dir) { console.log('Usage: see the header of this file'); process.exit(1) }
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
const base = read('attachment-map.private.json')
const extra = read('extra-attachment-map.private.json').files || []
const items = [
    ...base.filter((x) => x.stored_as).map((x) => ({ type: x.rel_type, parent: String(x.rel_id), id: String(x.id), name: x.file_name || path.basename(x.archive_path), blob: x.stored_as, visible: x.visible_to_customer === '1', bytes: x.bytes })),
    ...extra.map((x) => ({ type: x.table === 'tblproject_files' ? 'project' : 'ticket', parent: String(x.parent_id), id: `${x.table === 'tblproject_files' ? 'p' : 't'}${x.source_id}`, name: path.basename(x.archive_path), blob: x.stored_as, visible: x.visible_to_customer === '1', bytes: x.bytes })),
]

// Perfex record id -> our ObjectId
const idMap = {}
for (const t of new Set(items.map((i) => i.type))) {
    const rows = await prisma[MODEL[t]].findMany({ where: { legacyId: { not: null } }, select: { id: true, legacyId: true } })
    idMap[t] = Object.fromEntries(rows.map((r) => [String(r.legacyId), r.id]))
}
const plan = items.map((i) => {
    const [kind, mime] = typeOf(i.name)
    const key = `trtcrm/perfex/${i.type}/${i.parent}/${i.id}-${safe(i.name)}`
    return { ...i, key, kind, mime, relType: i.type, relId: idMap[i.type]?.[i.parent] || null, file: path.join(dir, 'attachments', i.blob) }
})
const linked = plan.filter((p) => p.relId), orphan = plan.filter((p) => !p.relId)
const missing = plan.filter((p) => !fs.existsSync(p.file))
const mb = (n) => (n / 1e6).toFixed(1)
console.log(`files in the maps: ${plan.length} (${mb(plan.reduce((n, p) => n + (p.bytes || 0), 0))} MB)`)
for (const t of Object.keys(MODEL)) { const l = plan.filter((p) => p.type === t); if (l.length) console.log(`  ${t}: ${l.length} files, ${l.filter((p) => p.relId).length} linked to a record`) }
console.log(`blobs missing on disk: ${missing.length}; files whose record is not in the database: ${orphan.length}`)
if (orphan.length) console.log('  not linked (will be skipped):', orphan.slice(0, 8).map((p) => `${p.type}#${p.parent}`).join(', '), orphan.length > 8 ? '...' : '')
if (!apply) { console.log(`\nDry run only. Bucket: ${bucket} (${region}). Add --apply to upload ${linked.length} files.`); await prisma.$disconnect(); process.exit(0) }

// upload (6 at a time), skip objects that already exist
const todo = linked.filter((p) => fs.existsSync(p.file))
let done = 0, up = 0, skip = 0, fail = 0
const queue = [...todo]
await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
        const p = queue.shift()
        try {
            let exists = true
            try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: p.key })) } catch { exists = false }
            if (!exists) {
                await s3.send(new PutObjectCommand({ Bucket: bucket, Key: p.key, Body: fs.readFileSync(p.file), ContentType: p.mime, ACL: 'public-read', CacheControl: 'public, max-age=31536000, immutable', ContentDisposition: p.kind === 'image' ? 'inline' : `inline; filename*=UTF-8''${encodeURIComponent(safe(p.name))}` }))
                up++
            } else skip++
        } catch (e) { fail++; console.log(`  failed ${p.key}: ${String(e.message).slice(0, 80)}`) }
        done++
        if (done % 50 === 0) console.log(`  ${done}/${todo.length}`)
    }
}))
console.log(`uploaded ${up}, already there ${skip}, failed ${fail}`)
const rows = todo.map((p) => ({ key: p.key, name: safe(p.name), mime: p.mime, kind: p.kind, size: p.bytes || fs.statSync(p.file).size, relType: p.relType, relId: p.relId, visible: p.visible }))
console.log('rows in this database:', await createRows(rows))
fs.writeFileSync('media-rows.json', JSON.stringify(rows))
console.log('wrote media-rows.json (use --rows on another database, e.g. staging, after restoring the same data)')
await prisma.$disconnect()
