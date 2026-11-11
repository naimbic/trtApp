import { NextResponse } from 'next/server'
import { assistEmail, emailAssistStatus } from '@/lib/crm/ai/emailAssist'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await emailAssistStatus()) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await assistEmail(await request.json())) } catch (e) { return errorResponse(e) }
}
