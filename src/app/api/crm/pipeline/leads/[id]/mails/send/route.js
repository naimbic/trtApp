import { NextResponse } from 'next/server'
import { sendDraftMail, checkDraftMail } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { const b = await request.json(); if (b.action === 'check') return NextResponse.json(await checkDraftMail((await params).id, b.mailId, Number(b.index), b.done)); return NextResponse.json(await sendDraftMail((await params).id, b.mailId)) } catch (e) { return errorResponse(e) }
}
