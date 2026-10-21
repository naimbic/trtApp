import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { completeMilestone } from '@/lib/crm/milestonesApi'

export async function POST(_req, { params }) {
    try { return NextResponse.json(await completeMilestone((await params).id)) } catch (e) { return errorResponse(e) }
}
