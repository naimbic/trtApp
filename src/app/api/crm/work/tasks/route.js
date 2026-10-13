import { NextResponse } from 'next/server'
import { listTasks, saveTask } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listTasks(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveTask(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
