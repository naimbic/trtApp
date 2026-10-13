import { NextResponse } from 'next/server'
import { contractPage } from '@/lib/crm/contractPublic'
import { trackView } from '@/lib/crm/viewTracking'

export async function GET(request, { params }) {
    const { id, hash } = await params
    const html = await contractPage(id, hash)
    if (!html) return new NextResponse('Contract not found.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    trackView('contract', id, request)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
