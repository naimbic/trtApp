import { NextResponse } from 'next/server'
import { runReport } from '@/lib/crm/reportsApi'
import { errorResponse } from '@/lib/crm/crud'

export const maxDuration = 120

export async function GET(request, { params }) {
    try { return NextResponse.json(await runReport((await params).kind, Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}
