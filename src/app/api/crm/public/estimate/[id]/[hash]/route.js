import { NextResponse } from 'next/server'
import { estimatePage } from '@/lib/crm/estimatePublic'

export async function GET(_request, { params }) {
    const { id, hash } = await params
    const html = await estimatePage(id, hash)
    if (!html) return new NextResponse('Estimate not found.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
