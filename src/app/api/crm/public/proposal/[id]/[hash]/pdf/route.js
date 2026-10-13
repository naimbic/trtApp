import { NextResponse } from 'next/server'
import { proposalPdf } from '@/lib/crm/proposalPublic'

export async function GET(_request, { params }) {
    const { id, hash } = await params
    try {
        const r = await proposalPdf(id, hash)
        if (!r) return new NextResponse('Proposal not found.', { status: 404 })
        return new NextResponse(r.pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${r.name}"`, 'Cache-Control': 'no-store' } })
    } catch (e) {
        return new NextResponse(e.message || 'Could not create the PDF', { status: e.status || 500 })
    }
}
