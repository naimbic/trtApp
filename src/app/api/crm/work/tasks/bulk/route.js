import { NextResponse } from 'next/server'
import { bulkTasks } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { ids: [...], action: 'status' | 'priority' | 'assign' | 'delete', value } → { done, failed: [{ id, error }] }
export async function POST(request) {
    try { return NextResponse.json(await bulkTasks(await request.json())) } catch (e) { return errorResponse(e) }
}
