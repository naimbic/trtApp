import { NextResponse } from 'next/server'
import { getCalendarItems, createCalendarEvent } from '@/lib/crm/calendar'

const fail = (e) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || 500 })

// GET /api/crm/calendar?from=ISO&to=ISO
export async function GET(request) {
    try {
        const sp = request.nextUrl.searchParams
        const data = await getCalendarItems({ from: sp.get('from'), to: sp.get('to') })
        if (!data) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        return NextResponse.json(data)
    } catch (e) {
        return fail(e)
    }
}

export async function POST(request) {
    try {
        return NextResponse.json(await createCalendarEvent(await request.json()), { status: 201 })
    } catch (e) {
        return fail(e)
    }
}
