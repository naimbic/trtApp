import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { loadProposalDoc, proposalHtmlDoc } from '@/lib/crm/proposalPublic'
import { pdfSettings, paperCss } from '@/lib/crm/docStyle'
import { PROPOSAL_CSS } from '@/lib/crm/proposalDoc'
import { assertDocVisible } from '@/lib/crm/docAccess'
import { errorResponse } from '@/lib/crm/crud'

// Staff preview of the document exactly as the PDF will print it.
export async function GET(_request, { params }) {
    try {
        const session = await requirePermission('proposals', 'view')
        const { id } = await params
        await assertDocVisible(session, 'proposal', id)
        const d = await loadProposalDoc(id, null, true)
        if (!d) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
        const S = await pdfSettings('proposal')
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${d.number}</title><style>${S.baseCss()}body{padding:18px 26px}${PROPOSAL_CSS}${paperCss()}</style></head><body>${await proposalHtmlDoc(d, S)}</body></html>`
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    } catch (e) {
        return errorResponse(e)
    }
}
