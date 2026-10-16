import { NextResponse } from 'next/server'
import { teamDashboard, setTeamGoals } from '@/lib/crm/teamDashboard'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await teamDashboard({ days: request.nextUrl.searchParams.get('days') })) } catch (e) { return errorResponse(e) }
}

// PUT { weeklyTasks, onTimeRate }: the goals (managers and administrators)
export async function PUT(request) {
    try { return NextResponse.json(await setTeamGoals(await request.json())) } catch (e) { return errorResponse(e) }
}
