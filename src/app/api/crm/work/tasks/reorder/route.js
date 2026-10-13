import { NextResponse } from 'next/server'
import { reorderTasks } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { const b = await request.json(); return NextResponse.json(await reorderTasks(b.status, b.ids)) } catch (e) { return errorResponse(e) }
}
