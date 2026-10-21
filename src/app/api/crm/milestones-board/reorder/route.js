import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { reorderMilestones } from '@/lib/crm/milestonesApi'

export async function POST(request) {
    try {
        const b = await request.json()
        return NextResponse.json(await reorderMilestones(b.projectId, b.ids))
    } catch (e) {
        return errorResponse(e)
    }
}
