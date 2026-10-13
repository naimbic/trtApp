import { NextResponse } from 'next/server'
import { moveTask } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await moveTask((await params).id, await request.json())) } catch (e) { return errorResponse(e) }
}
