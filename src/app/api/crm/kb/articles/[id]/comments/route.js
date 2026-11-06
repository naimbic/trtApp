import { NextResponse } from 'next/server'
import { addComment, editComment, deleteComment, reactComment, mentionComment } from '@/lib/crm/kbApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const id = (await params).id
        const b = await request.json()
        if (b.mention) return NextResponse.json(await mentionComment(id, b.noteId, b.mention))
        if (b.react) return NextResponse.json(await reactComment(id, b.noteId, b.react))
        return NextResponse.json(await addComment(id, b))
    } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { const b = await request.json(); return NextResponse.json(await editComment((await params).id, b.noteId, b.content)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteComment((await params).id, request.nextUrl.searchParams.get('noteId'))) } catch (e) { return errorResponse(e) }
}
