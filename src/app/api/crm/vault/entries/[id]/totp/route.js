import { NextResponse } from 'next/server'
import { totpCode } from '@/lib/crm/vaultApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(_r, { params }) {
    try { return NextResponse.json(await totpCode((await params).id), { headers: { 'Cache-Control': 'no-store' } }) } catch (e) { return errorResponse(e) }
}
