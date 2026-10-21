import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { milestonesBoard, saveMilestone } from '@/lib/crm/milestonesApi'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try {
        const sp = new URL(request.url).searchParams
        return NextResponse.json(await milestonesBoard({ projectId: sp.get('projectId'), query: sp.get('q') }))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        return NextResponse.json(await saveMilestone(await request.json()), { status: 201 })
    } catch (e) {
        return errorResponse(e)
    }
}
