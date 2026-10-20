import { NextResponse } from 'next/server'
import { getGoalsBoard } from '@/lib/crm/goals'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await getGoalsBoard()) } catch (e) { return errorResponse(e) }
}
