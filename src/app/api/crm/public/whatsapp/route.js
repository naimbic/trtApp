import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getOptions, setOptions } from '@/lib/crm/mailer'
import { alertAdmins } from '@/lib/crm/alerts'
import { explainWhatsapp, failedStatuses, validSignature } from '@/lib/crm/whatsappCalc'

export const dynamic = 'force-dynamic'

const safe = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y) }

// The webhook Meta calls (Meta for Developers → WhatsApp → Configuration → Webhook: this address + the verify token shown in Settings).
// It is NOT needed to send messages; it tells the CRM when a message could not be delivered afterwards (the administrators see why),
// and it brings in what leads write to the number: subscribe the webhook to the "messages" field for the WhatsApp tab of a lead.
export async function GET(request) {
    const q = request.nextUrl.searchParams
    const o = await getOptions(['whatsapp_verify_token'])
    if (q.get('hub.mode') === 'subscribe' && safe(q.get('hub.verify_token'), o('whatsapp_verify_token'))) return new NextResponse(q.get('hub.challenge') || '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request) {
    const raw = await request.text()
    const o = await getOptions(['whatsapp_app_secret', 'whatsapp_failures'])
    // with the App Secret saved, only Meta (which signs the body with it) is believed
    if (o('whatsapp_app_secret') && !validSignature(raw, request.headers.get('x-hub-signature-256'), o('whatsapp_app_secret'))) return new NextResponse('Bad signature', { status: 401 })
    let payload
    try { payload = JSON.parse(raw) } catch { return new NextResponse('Bad request', { status: 400 }) }
    const failed = failedStatuses(payload)
    if (failed.length) {
        let list = []
        try { list = JSON.parse(o('whatsapp_failures') || '[]') } catch { /* start again */ }
        list = [...failed.map((f) => ({ ...f, why: explainWhatsapp({ code: f.code, message: f.title, error_data: { details: f.details } }) })), ...list].slice(0, 20)
        await setOptions({ whatsapp_failures: JSON.stringify(list) })
        await alertAdmins({ key: 'whatsapp-failed', title: 'A WhatsApp message was not delivered', text: `${failed[0].to ? `To ${failed[0].to}: ` : ''}${list[0].why}`, everyMinutes: 120 })
    }
    // the messages leads wrote to the number, and the delivered / read marks of our answers (the WhatsApp tab of a lead)
    try { await (await import('@/lib/crm/leadWhatsappApi')).recordWhatsappWebhook(payload) } catch (e) { console.error('[whatsapp webhook]', e.message) }
    return NextResponse.json({ ok: true })
}
