import { NextResponse } from 'next/server'
import { purchaseOrderFromEstimate } from '@/server/actions/crm/sales/purchaseOrders'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(_request, { params }) {
    try {
        const { id } = await params
        const r = await purchaseOrderFromEstimate(id)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
