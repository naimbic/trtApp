import { NextResponse } from 'next/server'
import { renderInvoicePdf, renderInvoiceHtml, pdfFileName } from '@/lib/crm/invoicePdf'

export async function GET(_request, { params }) {
    const { id, hash } = await params
    try {
        const pdf = await renderInvoicePdf(id, { hash })
        if (!pdf) return new NextResponse('Invoice not found.', { status: 404 })
        const html = await renderInvoiceHtml(id, { hash })
        const title = /<title>([^<]*)<\/title>/.exec(html || '')?.[1] || 'invoice'
        return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${pdfFileName(title)}"`, 'Cache-Control': 'no-store' } })
    } catch (e) {
        return new NextResponse(e.message || 'Could not create the PDF', { status: e.status || 500 })
    }
}
