import { NextResponse } from 'next/server'
import { saveGroup, deleteGroup } from '@/lib/crm/kbApi'
import { errorResponse } from '@/lib/crm/crud'

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveGroup(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteGroup((await params).id)) } catch (e) { return errorResponse(e) }
}
