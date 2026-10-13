import { NextResponse } from 'next/server'
import { reorderLeads } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { const b = await request.json(); return NextResponse.json(await reorderLeads(b.statusId, b.ids)) } catch (e) { return errorResponse(e) }
}
