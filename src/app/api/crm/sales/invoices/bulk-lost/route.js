import { NextResponse } from 'next/server'
import { markInvoicesLost } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try {
        const b = await request.json().catch(() => ({}))
        return NextResponse.json(await markInvoicesLost(Array.isArray(b.ids) ? b.ids : [], b.lost !== false))
    } catch (e) { return errorResponse(e) }
}
