import { NextResponse } from 'next/server'
import { addNote, deleteNote } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await addNote((await params).id, await request.json())) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteNote((await params).id, request.nextUrl.searchParams.get('noteId'))) } catch (e) { return errorResponse(e) }
}
