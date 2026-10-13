import { NextResponse } from 'next/server'
import { getTask, saveTask, deleteTask } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await getTask((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveTask(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteTask((await params).id)) } catch (e) { return errorResponse(e) }
}
