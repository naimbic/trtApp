import { NextResponse } from 'next/server'
import { deletePayment } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function DELETE(request, { params }) {
    try {
        const { id } = await params
        const r = await deletePayment(id, new URL(request.url).searchParams.get('force') === '1')
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
