import { NextResponse } from 'next/server'
import { calendarLookups } from '@/lib/crm/calendar'

export async function GET() {
    try {
        return NextResponse.json(await calendarLookups())
    } catch (e) {
        return NextResponse.json({ error: e.message || String(e) }, { status: e.status || 500 })
    }
}
