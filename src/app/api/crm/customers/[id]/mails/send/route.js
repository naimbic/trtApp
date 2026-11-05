import { NextResponse } from 'next/server'
import { sendClientDraft, checkClientDraft, commentClientMail, mentionClientMail } from '@/lib/crm/clientMailsApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { mailId } sends the draft now · POST { action: 'check', mailId, index, done } confirms or un-confirms one check
export async function POST(request, { params }) {
    try { const b = await request.json(); const id = (await params).id; if (b.action === 'comment') return NextResponse.json(await commentClientMail(id, b.mailId, b.content)); if (b.action === 'mention') return NextResponse.json(await mentionClientMail(id, b.mailId, b.staffId)); if (b.action === 'check') return NextResponse.json(await checkClientDraft(id, b.mailId, Number(b.index), b.done)); return NextResponse.json(await sendClientDraft(id, b.mailId)) } catch (e) { return errorResponse(e) }
}
