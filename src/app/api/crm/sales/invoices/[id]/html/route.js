import { NextResponse } from 'next/server'
import { renderInvoiceHtml } from '@/lib/crm/invoicePdf'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try {
        const { id } = await params
        const html = await renderInvoiceHtml(id)
        if (!html) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    } catch (e) {
        return errorResponse(e)
    }
}
