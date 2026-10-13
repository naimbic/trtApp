import { NextResponse } from 'next/server'
import { flagLead } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await flagLead((await params).id, (await request.json()).action)) } catch (e) { return errorResponse(e) }
}
