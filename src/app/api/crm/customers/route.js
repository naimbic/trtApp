import { NextResponse } from 'next/server'
import { listClients, createClient } from '@/lib/crm/clientsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await listClients(Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        return NextResponse.json(await createClient(await request.json()), { status: 201 })
    } catch (e) {
        return errorResponse(e)
    }
}
