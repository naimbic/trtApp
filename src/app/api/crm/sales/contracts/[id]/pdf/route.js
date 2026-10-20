import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { contractPdf } from '@/lib/crm/contractPublic'
import { assertDocVisible } from '@/lib/crm/docAccess'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const session = await requirePermission('contracts', 'view')
        const { id } = await params
        await assertDocVisible(session, 'contract', id)
        const r = await contractPdf(id, null, true)
        if (!r) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
        return new NextResponse(r.pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${r.name}"`, 'Cache-Control': 'no-store' } })
    } catch (e) { return errorResponse(e) }
}
