#!/usr/bin/env node
/**
 * Restore a backup file made by the CRM (backups/trtcrm-YYYY-MM-DD.ndjson.gz, downloaded from Settings → Cron job → Backups).
 *   node scripts/restore-backup.mjs <file.ndjson.gz>            → reads the file and says what it holds (nothing is written)
 *   node scripts/restore-backup.mjs <file.ndjson.gz> --apply    → writes every document into the database DATABASE_URL points to
 * An existing document with the same _id is replaced. Run it on an EMPTY database (or a copy) to be safe; keep DATABASE_URL in mind.
 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import readline from 'node:readline'
import { PrismaClient } from '@prisma/client'

const file = process.argv[2]
const apply = process.argv.includes('--apply')
if (!file || !fs.existsSync(file)) { console.error('Give the backup file: node scripts/restore-backup.mjs <file.ndjson.gz> [--apply]'); process.exit(1) }
const prisma = new PrismaClient()
const rl = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity })
const counts = {}
let batch = [], current = null, meta = null
const flush = async () => {
    if (!batch.length) return
    // delete the ids that exist, then insert: a restore is a replace
    const ids = batch.map((d) => d._id)
    await prisma.$runCommandRaw({ delete: current, deletes: [{ q: { _id: { $in: ids } }, limit: 0 }] })
    await prisma.$runCommandRaw({ insert: current, documents: batch, ordered: false })
    batch = []
}
for await (const line of rl) {
    if (!line.trim()) continue
    const row = JSON.parse(line)
    if (row.meta) { meta = row.meta; continue }
    counts[row.c] = (counts[row.c] || 0) + 1
    if (!apply) continue
    if (current !== row.c) { await flush(); current = row.c }
    batch.push(row.d)
    if (batch.length >= 500) await flush()
}
if (apply) await flush()
console.log(`Backup of ${meta?.at || 'unknown date'}: ${Object.keys(counts).length} collections, ${Object.values(counts).reduce((a, b) => a + b, 0)} documents`)
for (const [c, n] of Object.entries(counts)) console.log(`  ${c}: ${n}`)
console.log(apply ? 'Restored.' : 'Nothing was written. Add --apply to restore.')
await prisma.$disconnect()
