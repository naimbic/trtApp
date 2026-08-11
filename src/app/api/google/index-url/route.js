import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { requestIndexing, requestRemoval, inspectUrl } from '@/lib/google-apis'

export async function POST(request) {
    try {
        // Admin-only: this triggers Google Indexing/Removal writes.
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const { url, slug, action } = await request.json()
        if (!url) {
            return NextResponse.json({ data: null, error: 'URL is required' }, { status: 400 })
        }

        // Inspect action — check real index status via URL Inspection API
        if (action === 'inspect') {
            const inspection = await inspectUrl(url)
            if (slug && inspection) {
                await prisma.indexingLog.create({
                    data: {
                        slug,
                        url,
                        action: 'inspect',
                        status: inspection.verdict || 'UNKNOWN',
                        method: 'url-inspection-api',
                        error: null,
                    },
                })
            }
            return NextResponse.json({ data: { success: true, inspection }, error: null })
        }

        const result = action === 'remove'
            ? await requestRemoval(url)
            : await requestIndexing(url)

        // Log the push
        if (slug) {
            await prisma.indexingLog.create({
                data: {
                    slug,
                    url,
                    action: action || 'index',
                    status: result.success ? 'success' : 'failed',
                    method: result.method || null,
                    error: result.error || null,
                },
            })
        }

        return NextResponse.json({ data: result, error: null })
    } catch (error) {
        console.error('POST /api/google/index-url error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}
