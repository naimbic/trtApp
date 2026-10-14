import { NextResponse } from 'next/server'
import { kbHub } from '@/lib/crm/kbApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await kbHub(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}
