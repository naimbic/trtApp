import { NextResponse } from 'next/server'
import { hoursReport } from '@/lib/crm/workHours'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const sp = request.nextUrl.searchParams
        return NextResponse.json(await hoursReport({ from: sp.get('from'), to: sp.get('to'), staffId: sp.get('staffId') || null }))
    } catch (e) {
        return errorResponse(e)
    }
}
