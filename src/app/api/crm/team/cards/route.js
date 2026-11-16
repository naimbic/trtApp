import { NextResponse } from 'next/server'
import { listCards } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await listCards())
    } catch (e) {
        return errorResponse(e)
    }
}
