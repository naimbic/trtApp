import { NextResponse } from 'next/server'
import { savePlatform } from '@/lib/crm/issuesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await savePlatform(await request.json(), null), { status: 201 }) } catch (e) { return errorResponse(e) }
}
