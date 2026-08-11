import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { corsResponse, refreshCors } from '@/lib/cors'
import { guardIngest } from '@/lib/platform/ingest'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request) {
    await refreshCors()
    return corsResponse(request)
}

// POST /api/404-log — log 404 errors (public, CORS, site-aware)
// Aggregates by (site, path): upserts hitCount instead of one row per hit
export async function POST(request) {
    const { slug, headers, error } = await guardIngest(request, { rateMs: 5000 })
    if (error) {
        return NextResponse.json(
            { data: null, error: error.message },
            { status: error.status, headers }
        )
    }
    try {
        const body = await request.json()
        const path = body.path
        if (!path) {
            return NextResponse.json(
                { data: null, error: 'path is required' },
                { status: 400, headers }
            )
        }

        // Upsert on the compound (site, path) unique key
        await prisma.errorLog.upsert({
            where: { site_path: { site: slug, path } },
            update: {
                hitCount: { increment: 1 },
                referrer: body.referrer || undefined,
                userAgent: body.ua || undefined,
            },
            create: {
                site: slug,
                path,
                hitCount: 1,
                referrer: body.referrer || null,
                userAgent: body.ua || null,
            },
        })

        return NextResponse.json(
            { data: { success: true }, error: null },
            { headers }
        )
    } catch (error) {
        console.error('POST /api/404-log error:', error)
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500, headers }
        )
    }
}
