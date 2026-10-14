import { NextResponse } from 'next/server'
import { setCallsEnabled } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await setCallsEnabled(!!(await request.json().catch(() => ({}))).calls)) } catch (e) { return errorResponse(e) }
}
