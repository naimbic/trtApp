import { NextResponse } from 'next/server'
import { addTicketReminder, deleteTicketReminder } from '@/lib/crm/ticketsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await addTicketReminder((await params).id, await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteTicketReminder((await params).id, request.nextUrl.searchParams.get('reminderId'))) } catch (e) { return errorResponse(e) }
}
