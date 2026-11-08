import { NextResponse } from 'next/server'
import { leadChecklist } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

// The plain checklist of a lead (when Settings > Leads keeps its items as plain lines instead of tasks).
export async function POST(request, { params }) {
    try { return NextResponse.json(await leadChecklist((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}
