import { NextResponse } from 'next/server'
import { trackView } from '@/lib/crm/viewTracking'
import { estimatePage } from '@/lib/crm/estimatePublic'

export async function GET(request, { params }) {
    const { id, hash } = await params
    const html = await estimatePage(id, hash)
    if (!html) return new NextResponse('Estimate not found.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    trackView('estimate', id, request)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
