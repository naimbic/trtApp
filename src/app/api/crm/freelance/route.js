import { NextResponse } from 'next/server'
import { listFreelance, saveFreelance } from '@/lib/crm/freelanceApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listFreelance(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveFreelance(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
