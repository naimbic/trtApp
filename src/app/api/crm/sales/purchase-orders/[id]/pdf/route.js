import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { purchaseOrderPdf } from '@/lib/crm/purchaseOrderPdf'
import { assertDocVisible } from '@/lib/crm/docAccess'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try {
        const session = await requirePermission('purchase_orders', 'view')
        const { id } = await params
        await assertDocVisible(session, 'purchase_order', id)
        const r = await purchaseOrderPdf(id)
        if (!r) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
        const download = new URL(request.url).searchParams.get('download') === '1'
        return new NextResponse(r.pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${r.name}"`, 'Cache-Control': 'no-store' } })
    } catch (e) {
        return errorResponse(e)
    }
}
