import { NextResponse } from 'next/server'
import { addProjectNote, deleteProjectNote } from '@/lib/crm/projectsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await addProjectNote((await params).id, (await request.json()).content)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteProjectNote((await params).id, request.nextUrl.searchParams.get('noteId'))) } catch (e) { return errorResponse(e) }
}
