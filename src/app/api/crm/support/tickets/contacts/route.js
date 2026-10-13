import { NextResponse } from 'next/server'
import { clientContacts } from '@/lib/crm/ticketsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await clientContacts(request.nextUrl.searchParams.get('clientId'))) } catch (e) { return errorResponse(e) }
}
