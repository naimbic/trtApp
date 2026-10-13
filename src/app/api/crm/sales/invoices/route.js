import { NextResponse } from 'next/server'
import { listInvoices } from '@/lib/crm/invoicesApi'
import { saveInvoice } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await listInvoices(Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        const r = await saveInvoice(await request.json())
        return NextResponse.json(r, { status: r.success ? 201 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
