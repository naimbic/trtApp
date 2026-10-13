import { NextResponse } from 'next/server'
import { getPurchaseOrderDocument, savePurchaseOrder, deletePurchaseOrder } from '@/server/actions/crm/sales/purchaseOrders'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { id } = await params
        const doc = await getPurchaseOrderDocument(id)
        return doc ? NextResponse.json(doc) : NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params
        const r = await savePurchaseOrder({ ...(await request.json()), id })
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        const r = await deletePurchaseOrder(id)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
