import { NextResponse } from 'next/server'
import { unpaidPoints } from '@/lib/crm/pointsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await unpaidPoints(request.nextUrl.searchParams.get('staffId'))) } catch (e) { return errorResponse(e) }
}
