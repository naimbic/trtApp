/**
 * Register all core TRT sites in the hub at once and print each API key.
 * Run against the HUB (trtApp) database. Idempotent — existing slugs are skipped.
 *
 * Each printed key goes into that site's Coolify env as PROXY_API_KEY (and set
 * ADMIN_API_URL=https://app.trtmaroc.com on every site).
 *
 * Usage:  node scripts/register-core-sites.mjs
 */
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// slug is the stable tag every lead/event from that site carries.
const SITES = [
    { name: 'TRT Digital', slug: 'trtdigital', domain: 'trtdigital.ma', color: '#207DE9' },
    { name: 'TRT SEA', slug: 'trtsea', domain: 'sea.ma', color: '#7C3AED' },
    { name: 'TRT Maroc', slug: 'trtmaroc', domain: 'trtmaroc.com', color: '#16A34A' },
    { name: 'TRT Digitals', slug: 'trtdigitals', domain: 'trtdigitals.com', color: '#FB7185' },
    { name: 'TRT Ads', slug: 'trtads', domain: 'trtads.ma', color: '#F97316' },
    { name: 'TRT Blog', slug: 'trtblog', domain: 'blog.trtmaroc.com', color: '#0EA5E9' },
]

function generateApiKey(slug) {
    const secret = crypto.randomBytes(24).toString('base64url')
    const raw = `trt_${slug}_${secret}`
    return { raw, prefix: raw.slice(0, 16), hash: crypto.createHash('sha256').update(raw).digest('hex') }
}

async function main() {
    console.log('Registering core TRT sites in the hub...\n')
    const created = []
    for (const s of SITES) {
        const existing = await prisma.site.findUnique({ where: { slug: s.slug } })
        if (existing) {
            console.log(`• ${s.slug.padEnd(12)} already exists — skipped (use dashboard to rotate its key)`)
            continue
        }
        const key = generateApiKey(s.slug)
        await prisma.site.create({
            data: {
                name: s.name,
                slug: s.slug,
                domain: s.domain,
                origins: [`https://${s.domain}`, `https://www.${s.domain}`],
                color: s.color,
                apiKeyHash: key.hash,
                apiKeyPrefix: key.prefix,
                active: true,
            },
        })
        created.push({ slug: s.slug, key: key.raw })
        console.log(`✓ ${s.slug.padEnd(12)} created`)
    }

    if (created.length) {
        console.log('\n──────── API KEYS (shown once — copy now) ────────')
        for (const c of created) {
            console.log(`\n${c.slug}:`)
            console.log(`  ADMIN_API_URL=https://app.trtmaroc.com`)
            console.log(`  PROXY_API_KEY=${c.key}`)
        }
        console.log('\nSet these in each site\'s Coolify env, then redeploy that site.')
    } else {
        console.log('\nNothing new to create.')
    }
}

main()
    .catch((e) => { console.error('Failed:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
