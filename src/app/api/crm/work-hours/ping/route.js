import { NextResponse } from 'next/server'
import { recordPing } from '@/lib/crm/workHours'
import { errorResponse } from '@/lib/crm/crud'

export async function POST() {
    try {
        return NextResponse.json(await recordPing())
    } catch (e) {
        return errorResponse(e)
    }
}
