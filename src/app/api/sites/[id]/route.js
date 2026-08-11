import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { generateApiKey, invalidateSiteCache } from '@/lib/platform/sites'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
    const session = await auth()
    return session?.user ? session : null
}

function normalizeOrigins(input) {
    if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean)
    if (typeof input === 'string') return input.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
    return undefined
}

// PATCH /api/sites/[id] — update site; body.rotateKey=true regenerates the key (admin)
export async function PATCH(request, { params }) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }
    try {
        const { id } = await params
        const body = await request.json()
        const site = await prisma.site.findUnique({ where: { id } })
        if (!site) {
            return NextResponse.json({ data: null, error: 'Site not found' }, { status: 404 })
        }

        const data = {}
        if (body.name !== undefined) data.name = String(body.name).trim()
        if (body.domain !== undefined) data.domain = body.domain || null
        if (body.color !== undefined) data.color = body.color || null
        if (body.active !== undefined) data.active = !!body.active
        const origins = normalizeOrigins(body.origins)
        if (origins !== undefined) data.origins = origins

        let newKey = null
        if (body.rotateKey) {
            newKey = generateApiKey(site.slug)
            data.apiKeyHash = newKey.hash
            data.apiKeyPrefix = newKey.prefix
        }

        const updated = await prisma.site.update({ where: { id }, data })
        invalidateSiteCache()

        return NextResponse.json({
            data: {
                id: updated.id,
                slug: updated.slug,
                active: updated.active,
                apiKeyPrefix: updated.apiKeyPrefix,
                ...(newKey ? { apiKey: newKey.raw } : {}),
            },
            error: null,
        })
    } catch (error) {
        console.error('PATCH /api/sites/[id] error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/sites/[id] (admin)
export async function DELETE(request, { params }) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }
    try {
        const { id } = await params
        await prisma.site.delete({ where: { id } })
        invalidateSiteCache()
        return NextResponse.json({ data: { success: true }, error: null })
    } catch (error) {
        console.error('DELETE /api/sites/[id] error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}
