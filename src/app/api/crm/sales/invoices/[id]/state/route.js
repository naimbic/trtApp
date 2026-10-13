import { NextResponse } from 'next/server'
import { setInvoiceState } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const { action } = await request.json()
        const r = await setInvoiceState(id, action)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
