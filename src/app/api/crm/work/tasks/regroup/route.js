import { NextResponse } from 'next/server'
import { regroupTask } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await regroupTask(await request.json())) } catch (e) { return errorResponse(e) }
}
