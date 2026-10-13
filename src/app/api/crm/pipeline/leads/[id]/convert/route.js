import { NextResponse } from 'next/server'
import { convertLead } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await convertLead((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}
