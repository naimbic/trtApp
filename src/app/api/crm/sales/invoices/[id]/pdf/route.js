import { NextResponse } from 'next/server'
import { renderInvoicePdf, pdfFileName } from '@/lib/crm/invoicePdf'
import { getInvoiceDocument } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try {
        const { id } = await params
        const doc = await getInvoiceDocument(id)
        if (!doc) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        const pdf = await renderInvoicePdf(id)
        const download = new URL(request.url).searchParams.get('download') === '1'
        return new NextResponse(pdf, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${pdfFileName(doc.invoice.displayNumber)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (e) {
        return errorResponse(e)
    }
}
