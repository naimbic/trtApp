import { NextResponse } from 'next/server'
import { feedByToken } from '@/lib/crm/calendar'

// Public, token-protected: Google / Apple / Outlook subscribe to this address.
export async function GET(_request, { params }) {
    const { token } = await params
    const ics = await feedByToken(String(token || '').replace(/\.ics$/, ''))
    if (!ics) return new NextResponse('Not found', { status: 404 })
    return new NextResponse(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } })
}
