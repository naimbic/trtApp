import { NextResponse } from 'next/server'
import { taskLookups } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await taskLookups()) } catch (e) { return errorResponse(e) }
}
