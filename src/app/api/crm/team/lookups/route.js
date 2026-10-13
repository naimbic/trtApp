import { NextResponse } from 'next/server'
import { teamLookups } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await teamLookups())
    } catch (e) {
        return errorResponse(e)
    }
}
