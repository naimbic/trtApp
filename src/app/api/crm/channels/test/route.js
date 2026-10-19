import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { sendTelegram, sendWhatsapp } from '@/lib/crm/channels'
import { errorResponse } from '@/lib/crm/crud'

// POST { channel: 'telegram' | 'whatsapp', to } — a test message with the accounts saved in Settings
export async function POST(request) {
    try {
        await requirePermission('settings', 'edit')
        const { channel, to } = await request.json()
        if (!String(to || '').trim()) return NextResponse.json({ error: 'Enter a chat id or a number' }, { status: 400 })
        const text = 'trtCRM: test message. Notifications reach you on this channel.'
        const r = channel === 'whatsapp' ? await sendWhatsapp(to, text) : await sendTelegram(to, text)
        return r.sent ? NextResponse.json({ success: true }) : NextResponse.json({ error: r.error }, { status: 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
