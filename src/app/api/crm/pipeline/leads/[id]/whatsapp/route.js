import { NextResponse } from 'next/server'
import { listLeadWhatsapp, sendLeadWhatsapp } from '@/lib/crm/leadWhatsappApi'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

// GET: the WhatsApp conversation with the lead · POST { text }: answer by WhatsApp
export async function GET(_request, { params }) {
    try { return NextResponse.json(await listLeadWhatsapp((await params).id)) } catch (e) { return errorResponse(e) }
}
export async function POST(request, { params }) {
    try { return NextResponse.json(await sendLeadWhatsapp((await params).id, await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) }
}
