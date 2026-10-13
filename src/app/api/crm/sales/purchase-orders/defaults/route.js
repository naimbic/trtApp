import { NextResponse } from 'next/server'
import { getPurchaseOrderDefaults } from '@/server/actions/crm/sales/purchaseOrders'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await getPurchaseOrderDefaults())
    } catch (e) {
        return errorResponse(e)
    }
}
