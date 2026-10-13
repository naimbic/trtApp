import { NextResponse } from 'next/server'
import { renderInvoiceHtml } from '@/lib/crm/invoicePdf'

// Public invoice page for the client. The secret hash in the address is the only credential.
export async function GET(_request, { params }) {
    const { id, hash } = await params
    const html = await renderInvoiceHtml(id, { hash, pdfHref: `/api/crm/public/invoice/${id}/${hash}/pdf` })
    if (!html) return new NextResponse('Invoice not found.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
