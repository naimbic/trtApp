import { NextResponse } from 'next/server'
import { listPayments } from '@/lib/crm/invoicesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await listPayments(Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}
