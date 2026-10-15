#!/usr/bin/env node
/**
 * Pictures inside contracts, e-mail templates, tickets and articles point to https://trtcrm.com/media/... (the old Perfex site).
 * They stop working when trtcrm.com becomes this app, so move them to the Space and rewrite the links.
 *
 *   node scripts/perfex-import/rewrite-media-urls.mjs <perfex site folder>            dry run (what would change)
 *   node scripts/perfex-import/rewrite-media-urls.mjs <perfex site folder> --apply    upload the files + rewrite the links
 *   node scripts/perfex-import/rewrite-media-urls.mjs --replace-only                  only rewrite the links (files already in the Space), e.g. on staging
 * Files go to trtcrm/perfex/media/<same path>. Safe to run again.
 */
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

dotenv.config({ path: path.join(process.cwd(), '.env') })
const args = process.argv.slice(2)
const replaceOnly = args.includes('--replace-only')
const apply = args.includes('--apply') || replaceOnly
const site = args.find((a) => !a.startsWith('--'))
if (!site && !replaceOnly) { console.log('Usage: see the header of this file'); process.exit(1) }
const prisma = new PrismaClient()
const bucket = process.env.DO_SPACES_BUCKET, region = process.env.DO_SPACES_REGION
const cdn = `https://${bucket}.${region}.cdn.digitaloceanspaces.com`
const s3 = new S3Client({ endpoint: `https://${region}.digitaloceanspaces.com`, region, credentials: { accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET } })
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf' }
const RE = /https?:\/\/(?:www\.)?trtcrm\.com\/media\/([^"'\s<>)]+)/gi
const FIELDS = [['crmContract', 'content'], ['crmEmailTemplate', 'message'], ['crmTicketReply', 'message'], ['crmKnowledgeBaseArticle', 'description'], ['crmProposal', 'content'], ['crmAnnouncement', 'message']]
const target = (rel) => `${cdn}/trtcrm/perfex/media/${rel.split('/').map((s) => encodeURIComponent(decodeURIComponent(s))).join('/')}`

const found = new Set()
const rows = []
for (const [model, field] of FIELDS) {
    let list = []
    try { list = await prisma[model].findMany({ select: { id: true, [field]: true } }) } catch { continue }
    for (const r of list) {
        const text = r[field]
        if (!text) continue
        const hits = [...String(text).matchAll(RE)]
        if (hits.length) { hits.forEach((h) => found.add(h[1])); rows.push({ model, field, id: r.id, text, n: hits.length }) }
    }
}
console.log(`links to trtcrm.com/media: ${rows.reduce((n, r) => n + r.n, 0)} in ${rows.length} records, ${found.size} different files`)
if (!apply) { for (const f of found) console.log('  ', decodeURIComponent(f), site && fs.existsSync(path.join(site, 'media', decodeURIComponent(f))) ? '(file found)' : '(FILE NOT FOUND)'); console.log('Dry run. Add --apply.'); await prisma.$disconnect(); process.exit(0) }

if (!replaceOnly) {
    for (const f of found) {
        const rel = decodeURIComponent(f), file = path.join(site, 'media', rel)
        if (!fs.existsSync(file)) { console.log(`  missing on disk, skipped: ${rel}`); continue }
        const ext = rel.split('.').pop().toLowerCase()
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `trtcrm/perfex/media/${rel}`, Body: fs.readFileSync(file), ContentType: MIME[ext] || 'application/octet-stream', ACL: 'public-read', CacheControl: 'public, max-age=31536000, immutable' }))
        console.log(`  uploaded ${rel}`)
    }
}
let changed = 0
for (const r of rows) {
    const next = String(r.text).replace(RE, (_m, rel) => target(rel))
    if (next !== r.text) { await prisma[r.model].update({ where: { id: r.id }, data: { [r.field]: next } }); changed++ }
}
console.log(`rewrote the links in ${changed} records`)
await prisma.$disconnect()
