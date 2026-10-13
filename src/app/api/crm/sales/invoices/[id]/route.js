import { NextResponse } from 'next/server'
import { getInvoiceDocument, saveInvoice, deleteInvoice } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { id } = await params
        const doc = await getInvoiceDocument(id)
        return doc ? NextResponse.json(doc) : NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params
        const r = await saveInvoice({ ...(await request.json()), id })
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        const r = await deleteInvoice(id)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
