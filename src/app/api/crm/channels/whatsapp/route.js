import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { whatsappStatus, renewWhatsappToken } from '@/lib/crm/whatsappHealth'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

// GET: is the WhatsApp number reachable, is the token valid and until when · POST: renew the token (needs the App ID and the App Secret)
export async function GET() {
    try { await requirePermission('settings', 'edit'); return NextResponse.json(await whatsappStatus()) } catch (e) { return errorResponse(e) }
}
export async function POST() {
    try { await requirePermission('settings', 'edit'); const r = await renewWhatsappToken(); return NextResponse.json(r, { status: r.ok ? 200 : 400 }) } catch (e) { return errorResponse(e) }
}
