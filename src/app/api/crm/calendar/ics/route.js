import { NextResponse } from 'next/server'
import { eventIcs } from '@/lib/crm/calendar'

export async function GET(request) {
    try {
        const { ics, name } = await eventIcs(request.nextUrl.searchParams.get('id'))
        return new NextResponse(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } })
    } catch (e) {
        return NextResponse.json({ error: e.message || String(e) }, { status: e.status || 500 })
    }
}
