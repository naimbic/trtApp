import { NextResponse } from 'next/server'
import { reorderGroups } from '@/lib/crm/kbApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await reorderGroups((await request.json()).ids)) } catch (e) { return errorResponse(e) }
}
