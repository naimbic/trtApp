import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { generateApiKey, invalidateSiteCache } from '@/lib/platform/sites'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
    const session = await auth()
    if (!session?.user) return null
    return session
}

function normalizeOrigins(input) {
    if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean)
    if (typeof input === 'string') {
        return input.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
    }
    return []
}

// GET /api/sites — list sites with per-site lead + view counts (admin)
export async function GET() {
    noStore()
    if (!(await requireAdmin())) {
        return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }
    try {
        const [sites, leadGroups, statGroups] = await Promise.all([
            prisma.site.findMany({ orderBy: { createdAt: 'asc' } }),
            prisma.submission.groupBy({ by: ['site'], _count: { _all: true } }),
            prisma.pageStat.groupBy({ by: ['site'], _sum: { views: true } }),
        ])
        const leadBySite = Object.fromEntries(leadGroups.map((g) => [g.site, g._count._all]))
        const viewBySite = Object.fromEntries(statGroups.map((g) => [g.site, g._sum.views || 0]))

        const data = sites.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            domain: s.domain,
            origins: s.origins,
            active: s.active,
            color: s.color,
            apiKeyPrefix: s.apiKeyPrefix,
            hasKey: !!s.apiKeyHash,
            createdAt: s.createdAt,
            leadCount: leadBySite[s.slug] || 0,
            viewCount: viewBySite[s.slug] || 0,
        }))
        return NextResponse.json({ data, error: null })
    } catch (error) {
        console.error('GET /api/sites error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/sites — create a site + generate its API key (returned ONCE) (admin)
export async function POST(request) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }
    try {
        const body = await request.json()
        const name = String(body.name || '').trim()
        const slug = String(body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
        if (!name || !slug) {
            return NextResponse.json(
                { data: null, error: 'name and slug are required' },
                { status: 400 }
            )
        }
        const existing = await prisma.site.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json(
                { data: null, error: `A site with slug "${slug}" already exists` },
                { status: 409 }
            )
        }

        const key = generateApiKey(slug)
        const site = await prisma.site.create({
            data: {
                name,
                slug,
                domain: body.domain || null,
                origins: normalizeOrigins(body.origins),
                color: body.color || null,
                apiKeyHash: key.hash,
                apiKeyPrefix: key.prefix,
                active: true,
            },
        })
        invalidateSiteCache()

        // Return the raw key ONCE — it is never retrievable again.
        return NextResponse.json(
            {
                data: { id: site.id, slug: site.slug, apiKey: key.raw, apiKeyPrefix: key.prefix },
                error: null,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('POST /api/sites error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}
