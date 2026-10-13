import { NextResponse } from 'next/server'
import { getTicket, updateTicket, deleteTicket } from '@/lib/crm/ticketsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await getTicket((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await updateTicket((await params).id, await request.json())) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteTicket((await params).id)) } catch (e) { return errorResponse(e) }
}
