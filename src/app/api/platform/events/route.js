import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { corsResponse, refreshCors } from '@/lib/cors'
import { guardIngest } from '@/lib/platform/ingest'
import { detectDevice, detectChannel, detectCountry } from '@/lib/platform/detect'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['view', 'like', 'share']
const COUNTER = { view: 'views', like: 'likes', share: 'shares' }

export async function OPTIONS(request) {
    await refreshCors()
    return corsResponse(request)
}

// POST /api/platform/events — first-party analytics ingest (public, CORS, site-aware)
// Body: { slug, type, referrer?, utmMedium?, country? }  OR  { events: [ ...same ] }
export async function POST(request) {
    const { slug: site, headers, error } = await guardIngest(request, { rateMs: 500 })
    if (error) {
        return NextResponse.json(
            { data: null, error: error.message },
            { status: error.status, headers }
        )
    }
    try {
        const body = await request.json()
        const items = Array.isArray(body?.events) ? body.events : [body]
        if (!items.length) {
            return NextResponse.json(
                { data: null, error: 'no events provided' },
                { status: 400, headers }
            )
        }

        const ua = request.headers.get('user-agent') || ''
        const device = detectDevice(ua)
        const country = detectCountry(request)

        let accepted = 0
        for (const ev of items) {
            const slug = (ev?.slug || ev?.path || '').trim()
            const type = ev?.type || 'view'
            if (!slug || !VALID_TYPES.includes(type)) continue

            const referrer = ev?.referrer || null
            const channel = detectChannel(referrer, ev?.utmMedium)

            // Append the raw event (source of truth for time-series + breakdowns)
            await prisma.pageEvent.create({
                data: {
                    site,
                    slug,
                    type,
                    device,
                    channel,
                    referrer,
                    country: ev?.country || country || null,
                    ua: ua.slice(0, 400) || null,
                },
            })

            // Maintain the fast per-(site,slug) counter cache
            const field = COUNTER[type]
            await prisma.pageStat.upsert({
                where: { site_slug: { site, slug } },
                update: { [field]: { increment: 1 } },
                create: {
                    site,
                    slug,
                    views: type === 'view' ? 1 : 0,
                    likes: type === 'like' ? 1 : 0,
                    shares: type === 'share' ? 1 : 0,
                },
            })
            accepted++
        }

        return NextResponse.json(
            { data: { success: true, accepted }, error: null },
            { status: 201, headers }
        )
    } catch (err) {
        console.error('POST /api/platform/events error:', err)
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500, headers }
        )
    }
}
