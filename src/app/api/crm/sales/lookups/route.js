import { NextResponse } from 'next/server'
import { getInvoiceLookups } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await getInvoiceLookups())
    } catch (e) {
        return errorResponse(e)
    }
}
