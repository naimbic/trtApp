import { NextResponse } from 'next/server'
import { saveTemplate, deleteTemplate } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function PATCH(request, { params }) {
    try { return NextResponse.json(await saveTemplate(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}
export async function DELETE(_request, { params }) {
    try { return NextResponse.json(await deleteTemplate((await params).id)) } catch (e) { return errorResponse(e) }
}
