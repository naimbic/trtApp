import { NextResponse } from 'next/server'
import { addIssueComment, deleteIssueComment } from '@/lib/crm/issuesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await addIssueComment((await params).id, (await request.json().catch(() => ({}))).content), { status: 201 }) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteIssueComment((await params).id, request.nextUrl.searchParams.get('commentId'))) } catch (e) { return errorResponse(e) }
}
