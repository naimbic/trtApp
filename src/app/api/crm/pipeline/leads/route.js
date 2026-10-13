import { NextResponse } from 'next/server'
import { listLeads, saveLead } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listLeads(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveLead(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
