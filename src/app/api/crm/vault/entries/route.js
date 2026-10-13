import { NextResponse } from 'next/server'
import { listEntries, saveEntry } from '@/lib/crm/vaultApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listEntries(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveEntry(await request.json(), null, request), { status: 201 }) } catch (e) { return errorResponse(e) }
}
