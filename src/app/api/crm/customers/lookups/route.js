import { NextResponse } from 'next/server'
import { clientLookups } from '@/lib/crm/clientsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await clientLookups())
    } catch (e) {
        return errorResponse(e)
    }
}
