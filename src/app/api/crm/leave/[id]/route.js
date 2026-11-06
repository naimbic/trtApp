import { NextResponse } from 'next/server'
import { updateLeave, deleteLeave } from '@/lib/crm/leaveApi'
import { errorResponse } from '@/lib/crm/crud'

export async function PATCH(request, { params }) {
    try { return NextResponse.json(await updateLeave((await params).id, await request.json())) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteLeave((await params).id)) } catch (e) { return errorResponse(e) }
}
