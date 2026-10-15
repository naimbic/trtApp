import { NextResponse } from 'next/server'
import { teamDashboard } from '@/lib/crm/teamDashboard'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await teamDashboard()) } catch (e) { return errorResponse(e) }
}
