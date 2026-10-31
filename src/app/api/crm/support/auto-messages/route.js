import { NextResponse } from 'next/server'
import { getAutoRules, saveAutoRules } from '@/lib/crm/ticketAuto'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await getAutoRules()) } catch (e) { return errorResponse(e) }
}

export async function PUT(request) {
    try { return NextResponse.json(await saveAutoRules(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}
