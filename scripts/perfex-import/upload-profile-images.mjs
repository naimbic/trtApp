#!/usr/bin/env node
/**
 * Uploads the Perfex profile pictures (staff and client contacts) to the Space and points the records at them.
 *   node scripts/perfex-import/upload-profile-images.mjs <perfex site folder>            dry run
 *   node scripts/perfex-import/upload-profile-images.mjs <perfex site folder> --apply
 * <site folder> is the folder that contains uploads/ (e.g. .data/perfex-core/site). Pictures only: staff_profile_images
 * and client_profile_images. Objects go to trtcrm/avatars/perfex/<kind>/<perfex id>-<name>. Safe to run again.
 */
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

dotenv.config({ path: path.join(process.cwd(), '.env') })
const site = process.argv.slice(2).find((a) => !a.startsWith('--'))
const apply = process.argv.includes('--apply')
if (!site) { console.log('Usage: see the header of this file'); process.exit(1) }
const prisma = new PrismaClient()
const bucket = process.env.DO_SPACES_BUCKET, region = process.env.DO_SPACES_REGION
const s3 = new S3Client({ endpoint: `https://${region}.digitaloceanspaces.com`, region, credentials: { accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET } })
const cdn = `https://${bucket}.${region}.cdn.digitaloceanspaces.com`
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }
const isUrl = (u) => /^https?:\/\//i.test(u || '')
const safe = (n) => String(n).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, '-')

const targets = [
    { kind: 'staff', folder: 'staff_profile_images', rows: await prisma.crmStaff.findMany({ where: { profileImage: { not: null } }, select: { id: true, legacyId: true, profileImage: true, userId: true } }) },
    { kind: 'contact', folder: 'client_profile_images', rows: await prisma.crmContact.findMany({ where: { profileImage: { not: null } }, select: { id: true, legacyId: true, profileImage: true } }) },
]
let found = 0, missing = 0, done = 0
for (const t of targets) {
    for (const r of t.rows) {
        if (isUrl(r.profileImage) || r.legacyId == null) continue
        const dir = path.join(site, 'uploads', t.folder, String(r.legacyId))
        const file = ['small_', 'thumb_', ''].map((p) => path.join(dir, p + r.profileImage)).find((f) => fs.existsSync(f))
        if (!file) { missing++; console.log(`  no file for ${t.kind} #${r.legacyId}: ${r.profileImage}`); continue }
        found++
        if (!apply) continue
        const ext = (file.split('.').pop() || '').toLowerCase()
        const key = `trtcrm/avatars/perfex/${t.kind}/${r.legacyId}-${safe(r.profileImage)}`
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: fs.readFileSync(file), ContentType: MIME[ext] || 'application/octet-stream', ACL: 'public-read', CacheControl: 'public, max-age=31536000, immutable' }))
        const url = `${cdn}/${key.split('/').map(encodeURIComponent).join('/')}`
        if (t.kind === 'staff') {
            await prisma.crmStaff.update({ where: { id: r.id }, data: { profileImage: url } })
            if (r.userId) { const u = await prisma.user.findUnique({ where: { id: r.userId }, select: { image: true } }); if (u && !isUrl(u.image)) await prisma.user.update({ where: { id: r.userId }, data: { image: url } }) }
        } else await prisma.crmContact.update({ where: { id: r.id }, data: { profileImage: url } })
        done++
    }
}
console.log(`pictures found on disk: ${found}, without a file: ${missing}${apply ? `, uploaded and linked: ${done}` : ' (dry run, add --apply)'}`)
await prisma.$disconnect()
