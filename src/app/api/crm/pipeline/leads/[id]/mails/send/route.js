import { NextResponse } from 'next/server'
import { sendDraftMail, checkDraftMail, commentMail, mentionMail } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { const b = await request.json(); if (b.action === 'comment') return NextResponse.json(await commentMail((await params).id, b.mailId, b.content)); if (b.action === 'mention') return NextResponse.json(await mentionMail((await params).id, b.mailId, b.staffId)); if (b.action === 'check') return NextResponse.json(await checkDraftMail((await params).id, b.mailId, Number(b.index), b.done)); return NextResponse.json(await sendDraftMail((await params).id, b.mailId)) } catch (e) { return errorResponse(e) }
}
