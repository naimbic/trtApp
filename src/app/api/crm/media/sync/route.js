import { NextResponse } from 'next/server'
import { syncFromSpace } from '@/lib/crm/mediaApi'
import { errorResponse } from '@/lib/crm/crud'

export const maxDuration = 60

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}))
        return NextResponse.json(await syncFromSpace({ force: !!body.force }))
    } catch (e) {
        return errorResponse(e)
    }
}
