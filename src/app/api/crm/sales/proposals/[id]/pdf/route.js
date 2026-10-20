import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { proposalPdf } from '@/lib/crm/proposalPublic'
import { assertDocVisible } from '@/lib/crm/docAccess'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try {
        const session = await requirePermission('proposals', 'view')
        const { id } = await params
        await assertDocVisible(session, 'proposal', id)
        const r = await proposalPdf(id, null, true)
        if (!r) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
        const download = new URL(request.url).searchParams.get('download') === '1'
        return new NextResponse(r.pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${r.name}"`, 'Cache-Control': 'no-store' } })
    } catch (e) {
        return errorResponse(e)
    }
}
