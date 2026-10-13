import { NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/lib/crm/dashboard'

// GET /api/crm/dashboard?range=today|yesterday|3d|7d|30d|month|lastmonth|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&currency=<id>
export async function GET(request) {
    try {
        const sp = Object.fromEntries(request.nextUrl.searchParams)
        const data = await getDashboardMetrics(sp)
        if (!data) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        return NextResponse.json(data)
    } catch (e) {
        return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
    }
}
