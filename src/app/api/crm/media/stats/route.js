import { NextResponse } from 'next/server'
import { mediaStats } from '@/lib/crm/mediaApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await mediaStats())
    } catch (e) {
        return errorResponse(e)
    }
}
