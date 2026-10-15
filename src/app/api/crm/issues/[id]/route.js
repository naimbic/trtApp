import { NextResponse } from 'next/server'
import { getIssue, saveIssue, deleteIssue } from '@/lib/crm/issuesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try { return NextResponse.json(await getIssue((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveIssue(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteIssue((await params).id)) } catch (e) { return errorResponse(e) }
}
