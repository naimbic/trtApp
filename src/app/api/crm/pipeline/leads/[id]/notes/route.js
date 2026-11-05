import { NextResponse } from 'next/server'
import { addNote, editNote, deleteNote, reactNote } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { const b = await request.json(); if (b.react) return NextResponse.json(await reactNote((await params).id, b.noteId, b.react)); return NextResponse.json(await addNote((await params).id, b)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { const b = await request.json(); return NextResponse.json(await editNote((await params).id, b.noteId, b.content)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteNote((await params).id, request.nextUrl.searchParams.get('noteId'))) } catch (e) { return errorResponse(e) }
}
