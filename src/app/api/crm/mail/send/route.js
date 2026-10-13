import { NextResponse } from 'next/server'
import { sendMail } from '@/lib/crm/mailApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try {
        return NextResponse.json(await sendMail(await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}
