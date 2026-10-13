import { NextResponse } from 'next/server'
import { logAction } from '@/lib/crm/vaultApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await logAction((await params).id, (await request.json().catch(() => ({}))).action, request)) } catch (e) { return errorResponse(e) }
}
