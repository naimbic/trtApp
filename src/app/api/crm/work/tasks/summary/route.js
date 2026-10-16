import { NextResponse } from 'next/server'
import { taskSummary } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await taskSummary(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}
