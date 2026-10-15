import { NextResponse } from 'next/server'
import { teamDashboard } from '@/lib/crm/teamDashboard'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await teamDashboard({ days: request.nextUrl.searchParams.get('days') })) } catch (e) { return errorResponse(e) }
}
