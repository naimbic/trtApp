/**
 * Backfill script — run ONCE against the database before deploying the
 * multi-site schema changes.
 *
 * Why: the new schema adds a REQUIRED `site` field (default "trtmaroc") to
 * submissions, page_stats, page_events and error_logs. Prisma + MongoDB throws
 * on read for documents that are missing a required field, so every existing
 * (legacy trtmaroc) document must get `site: "trtmaroc"` first. It also fills
 * the required `date` field on legacy page_events that only have `createdAt`.
 *
 * This is additive and idempotent — safe to re-run. It never deletes anything.
 *
 * Usage:  node scripts/backfill-site.mjs
 *         (reads DATABASE_URL from the environment / .env)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DEFAULT_SITE = 'trtmaroc'

async function setSiteWhereMissing(collection) {
    const res = await prisma.$runCommandRaw({
        update: collection,
        updates: [
            {
                q: { site: { $exists: false } },
                u: { $set: { site: DEFAULT_SITE } },
                multi: true,
            },
        ],
    })
    return res?.nModified ?? res?.n ?? 0
}

async function fillPageEventDates() {
    // Legacy page_events written by the frontend may have `createdAt` but no
    // `date`. `date` is now required — copy createdAt (or now) into date.
    const res = await prisma.$runCommandRaw({
        update: 'page_events',
        updates: [
            {
                q: { date: { $exists: false } },
                u: [{ $set: { date: { $ifNull: ['$createdAt', '$$NOW'] } } }],
                multi: true,
            },
        ],
    })
    return res?.nModified ?? res?.n ?? 0
}

async function main() {
    console.log('Backfilling site="%s" on legacy documents...', DEFAULT_SITE)
    for (const c of ['submissions', 'page_stats', 'page_events', 'error_logs']) {
        const n = await setSiteWhereMissing(c)
        console.log(`  ${c}: set site on ${n} docs`)
    }
    const d = await fillPageEventDates()
    console.log(`  page_events: filled date on ${d} docs`)
    console.log('Done. Safe to run `prisma db push` and deploy.')
}

main()
    .catch((e) => {
        console.error('Backfill failed:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
