import { NextResponse } from 'next/server'
import { addComment, deleteComment } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await addComment((await params).id, (await request.json()).content)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteComment((await params).id, request.nextUrl.searchParams.get('commentId'))) } catch (e) { return errorResponse(e) }
}
