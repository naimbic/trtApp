import { NextResponse } from 'next/server'
import { applyInvoiceFormat } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function POST() {
    try {
        return NextResponse.json(await applyInvoiceFormat())
    } catch (e) {
        return errorResponse(e)
    }
}
