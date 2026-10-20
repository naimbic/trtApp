import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { loadContractDoc, contractHtml } from '@/lib/crm/contractPublic'
import { pdfSettings, paperCss } from '@/lib/crm/docStyle'
import { CONTRACT_CSS } from '@/lib/crm/contractDoc'
import { assertDocVisible } from '@/lib/crm/docAccess'
import { errorResponse } from '@/lib/crm/crud'

// Staff preview of the contract exactly as the PDF prints it.
export async function GET(_request, { params }) {
    try {
        const session = await requirePermission('contracts', 'view')
        const { id } = await params
        await assertDocVisible(session, 'contract', id)
        const d = await loadContractDoc(id, null, true)
        if (!d) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
        const S = await pdfSettings('contract')
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${d.number}</title><style>${S.baseCss()}body{padding:18px 26px}${CONTRACT_CSS}${paperCss()}</style></head><body>${await contractHtml(d, S)}</body></html>`
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    } catch (e) { return errorResponse(e) }
}
