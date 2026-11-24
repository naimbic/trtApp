import { NextResponse } from 'next/server'
import { closeClient } from '@/lib/crm/clientsApi'
import { errorResponse } from '@/lib/crm/crud'

/** Mark a client as lost, junk or refused with the reason ({ status, reason }); { status: '' } reopens it. */
export async function POST(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await closeClient(id, await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}
