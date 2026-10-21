import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { getMilestone, saveMilestone, deleteMilestone } from '@/lib/crm/milestonesApi'

export const dynamic = 'force-dynamic'

export async function GET(_req, { params }) {
    try { return NextResponse.json(await getMilestone((await params).id)) } catch (e) { return errorResponse(e) }
}
export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveMilestone(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}
export async function DELETE(_req, { params }) {
    try { return NextResponse.json(await deleteMilestone((await params).id)) } catch (e) { return errorResponse(e) }
}
