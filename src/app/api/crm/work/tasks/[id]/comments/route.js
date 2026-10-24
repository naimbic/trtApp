import { NextResponse } from 'next/server'
import { addComment, editComment, deleteComment } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { const b = await request.json(); return NextResponse.json(await addComment((await params).id, b.content, b.replyToId)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { const b = await request.json(); return NextResponse.json(await editComment((await params).id, b.commentId, b.content)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteComment((await params).id, request.nextUrl.searchParams.get('commentId'))) } catch (e) { return errorResponse(e) }
}
