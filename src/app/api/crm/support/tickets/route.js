import { NextResponse } from 'next/server'
import { listTickets, createTicket } from '@/lib/crm/ticketsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listTickets(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await createTicket(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
