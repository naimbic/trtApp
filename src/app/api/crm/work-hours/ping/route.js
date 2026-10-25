import { NextResponse } from 'next/server'
import { recordPing } from '@/lib/crm/workHours'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}))
        return NextResponse.json(await recordPing({ input: body?.input }))
    } catch (e) {
        return errorResponse(e)
    }
}
