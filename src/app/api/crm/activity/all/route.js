import { NextResponse } from 'next/server'
import { allActivity } from '@/lib/crm/activityApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const q = request.nextUrl.searchParams
        return NextResponse.json(await allActivity({ from: q.get('from'), to: q.get('to'), staffId: q.get('staffId'), clientId: q.get('clientId'), types: q.get('types') }))
    } catch (e) {
        return errorResponse(e)
    }
}
