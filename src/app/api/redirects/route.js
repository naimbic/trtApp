import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { corsHeaders, corsResponse } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request) {
    return corsResponse(request)
}

// GET /api/redirects — list all redirects (public for frontend build, CORS)
export async function GET(request) {
    noStore()
    const headers = corsHeaders(request)
    try {
        const { searchParams } = new URL(request.url)
        const activeOnly = searchParams.get('active')
        // the sites read their active redirects without a session; the full list (hits, switched-off ones) is for signed-in people
        if (activeOnly !== 'true' && !(await auth())?.user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401, headers })

        const where = activeOnly === 'true' ? { active: true } : {}

        const redirects = await prisma.redirect.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ data: redirects, error: null }, { headers })
    } catch (error) {
        console.error('GET /api/redirects error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500, headers })
    }
}

// POST /api/redirects — create a redirect (admin auth required)
export async function POST(request) {
    const headers = corsHeaders(request)
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401, headers })
        }

        const body = await request.json()
        if (!body.from || !body.to) {
            return NextResponse.json({ data: null, error: 'from and to are required' }, { status: 400, headers })
        }

        const redirect = await prisma.redirect.create({
            data: {
                from: body.from,
                to: body.to,
                type: body.type === 302 ? 302 : 301,
                note: body.note || null,
                active: body.active !== false,
            },
        })

        // Link the error log to this redirect if it exists
        await prisma.errorLog.updateMany({
            where: { path: body.from },
            data: { redirectId: redirect.id },
        }).catch(() => {})

        return NextResponse.json({ data: redirect, error: null }, { headers })
    } catch (error) {
        console.error('POST /api/redirects error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500, headers })
    }
}
