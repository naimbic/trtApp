import { NextResponse } from 'next/server'
import { revealEntry } from '@/lib/crm/vaultApi'
import { errorResponse } from '@/lib/crm/crud'

// POST on purpose: revealing a secret is an action that is logged, never a cacheable read.
export async function POST(request, { params }) {
    try { return NextResponse.json(await revealEntry((await params).id, request), { headers: { 'Cache-Control': 'no-store' } }) } catch (e) { return errorResponse(e) }
}
