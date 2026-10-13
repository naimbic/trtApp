import { NextResponse } from 'next/server'
import { deletePayment } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        const r = await deletePayment(id)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
