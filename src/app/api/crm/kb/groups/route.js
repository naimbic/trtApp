import { NextResponse } from 'next/server'
import { saveGroup } from '@/lib/crm/kbApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await saveGroup(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
