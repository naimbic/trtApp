import { NextResponse } from 'next/server'
import { clientPayments } from '@/lib/crm/clientsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await clientPayments(id, Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}
