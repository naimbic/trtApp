import { NextResponse } from 'next/server'
import { renderInvoiceHtml } from '@/lib/crm/invoicePdf'
import { requirePermission } from '@/lib/crm/permissions'
import { assertDocVisible } from '@/lib/crm/docAccess'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try {
        const session = await requirePermission('invoices', 'view')
        const { id } = await params
        await assertDocVisible(session, 'invoice', id)
        const html = await renderInvoiceHtml(id)
        if (!html) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    } catch (e) {
        return errorResponse(e)
    }
}
