import { NextResponse } from 'next/server'
import { ticketLookups } from '@/lib/crm/ticketsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await ticketLookups()) } catch (e) { return errorResponse(e) }
}
