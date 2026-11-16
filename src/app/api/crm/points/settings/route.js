import { NextResponse } from 'next/server'
import { savePointSettings } from '@/lib/crm/pointsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function PUT(request) {
    try { return NextResponse.json(await savePointSettings(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}
