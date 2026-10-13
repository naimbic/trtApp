import { NextResponse } from 'next/server'
import { trackView } from '@/lib/crm/viewTracking'
import { proposalPage } from '@/lib/crm/proposalPublic'

export async function GET(request, { params }) {
    const { id, hash } = await params
    const html = await proposalPage(id, hash)
    if (!html) return new NextResponse('Proposal not found.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    trackView('proposal', id, request)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
