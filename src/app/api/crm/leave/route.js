import { NextResponse } from 'next/server'
import { listLeaves, createLeave } from '@/lib/crm/leaveApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listLeaves(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await createLeave(await request.json())) } catch (e) { return errorResponse(e) }
}
