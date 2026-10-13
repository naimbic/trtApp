import { NextResponse } from 'next/server'
import { leadLookups } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await leadLookups()) } catch (e) { return errorResponse(e) }
}
