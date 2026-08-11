/**
 * Create a spoke site + generate its Platform API key from the command line.
 * The raw key is printed ONCE — copy it into that site's Coolify env as
 * TRT_PLATFORM_KEY. Only the hash is stored here.
 *
 * Usage:
 *   node scripts/create-site.mjs "<name>" <slug> [domain] [origin1,origin2,...]
 *
 * Example:
 *   node scripts/create-site.mjs "TRT Digital" trtdigital trtdigital.com "https://trtdigital.com,https://www.trtdigital.com"
 *
 * Re-running with an existing slug rotates nothing — it just reports it exists.
 */
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function generateApiKey(slug) {
    const secret = crypto.randomBytes(24).toString('base64url')
    const raw = `trt_${slug}_${secret}`
    return { raw, prefix: raw.slice(0, 16), hash: crypto.createHash('sha256').update(raw).digest('hex') }
}

async function main() {
    const [name, slugRaw, domain, originsRaw] = process.argv.slice(2)
    if (!name || !slugRaw) {
        console.error('Usage: node scripts/create-site.mjs "<name>" <slug> [domain] [origin1,origin2,...]')
        process.exit(1)
    }
    const slug = slugRaw.toLowerCase().replace(/[^a-z0-9-]/g, '')
    const origins = (originsRaw || (domain ? `https://${domain}` : ''))
        .split(',').map((s) => s.trim()).filter(Boolean)

    const existing = await prisma.site.findUnique({ where: { slug } })
    if (existing) {
        console.log(`Site "${slug}" already exists (id ${existing.id}). Use the dashboard to rotate its key.`)
        return
    }

    const key = generateApiKey(slug)
    const site = await prisma.site.create({
        data: {
            name, slug,
            domain: domain || null,
            origins,
            apiKeyHash: key.hash,
            apiKeyPrefix: key.prefix,
            active: true,
        },
    })

    console.log('\n✅ Site created:', site.name, `(${site.slug})`)
    console.log('   origins:', origins.join(', ') || '(none)')
    console.log('\n🔑 API key (shown once — save it now):\n')
    console.log('   ' + key.raw)
    console.log('\n   Add to that site\'s Coolify env:')
    console.log('     TRT_PLATFORM_URL=https://<this-hub-domain>')
    console.log('     TRT_PLATFORM_KEY=' + key.raw + '\n')
}

main()
    .catch((e) => { console.error('Failed:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
