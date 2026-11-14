import { NextResponse } from 'next/server'
import { sendToMySpace } from '@/lib/crm/vaultApi'
import { errorResponse } from '@/lib/crm/crud'

// Copies a vault entry into the signed-in person's My space (as a secret password item).
export async function POST(request, { params }) {
    try { return NextResponse.json(await sendToMySpace((await params).id, request), { headers: { 'Cache-Control': 'no-store' } }) } catch (e) { return errorResponse(e) }
}
