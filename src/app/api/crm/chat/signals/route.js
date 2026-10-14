import { NextResponse } from 'next/server'
import { staffSignals, staffSendSignal } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await staffSignals()) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await staffSendSignal(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}
