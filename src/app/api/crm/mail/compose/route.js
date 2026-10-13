import { NextResponse } from 'next/server'
import { composeMail } from '@/lib/crm/mailApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const p = new URL(request.url).searchParams
        return NextResponse.json(await composeMail(p.get('kind'), p.get('id'), p.get('template')))
    } catch (e) {
        return errorResponse(e)
    }
}
