import { NextResponse } from 'next/server'
import { listScores } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await listScores())
    } catch (e) {
        return errorResponse(e)
    }
}
