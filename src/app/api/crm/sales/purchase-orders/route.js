import { NextResponse } from 'next/server'
import { listPurchaseOrders } from '@/lib/crm/purchaseOrdersApi'
import { savePurchaseOrder } from '@/server/actions/crm/sales/purchaseOrders'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await listPurchaseOrders(Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        const r = await savePurchaseOrder(await request.json())
        return NextResponse.json(r, { status: r.success ? 201 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
