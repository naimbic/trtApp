import { NextResponse } from 'next/server'
import { timeReport } from '@/lib/crm/timeReport'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const sp = request.nextUrl.searchParams
        return NextResponse.json(await timeReport({ days: sp.get('days'), staffId: sp.get('staffId') }))
    } catch (e) { return errorResponse(e) }
}
