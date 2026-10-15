import { NextResponse } from 'next/server'
import { listTickets, createTicket } from '@/lib/crm/ticketsApi'
import { errorResponse } from '@/lib/crm/crud'
import { readMessageBody } from '@/lib/crm/ticketFiles'

export async function GET(request) {
    try { return NextResponse.json(await listTickets(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { const { body, files } = await readMessageBody(request); return NextResponse.json(await createTicket(body, files), { status: 201 }) } catch (e) { return errorResponse(e) }
}
