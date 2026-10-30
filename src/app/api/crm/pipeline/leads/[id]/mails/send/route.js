import { NextResponse } from 'next/server'
import { sendDraftMail } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { const b = await request.json(); return NextResponse.json(await sendDraftMail((await params).id, b.mailId)) } catch (e) { return errorResponse(e) }
}
