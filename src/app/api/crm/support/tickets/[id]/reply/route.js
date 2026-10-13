import { NextResponse } from 'next/server'
import { replyTicket, deleteReply } from '@/lib/crm/ticketsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await replyTicket((await params).id, await request.json())) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteReply((await params).id, request.nextUrl.searchParams.get('replyId'))) } catch (e) { return errorResponse(e) }
}
