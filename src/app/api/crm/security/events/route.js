import { NextResponse } from 'next/server'
import { listSecurity } from '@/lib/crm/securityLog'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const q = request.nextUrl.searchParams
        return NextResponse.json(await listSecurity({ days: q.get('days'), kind: q.get('kind'), page: q.get('page') }))
    } catch (e) {
        return errorResponse(e)
    }
}
