import { NextResponse } from 'next/server'
import { contractPdf } from '@/lib/crm/contractPublic'

export async function GET(_request, { params }) {
    const { id, hash } = await params
    const r = await contractPdf(id, hash)
    if (!r) return new NextResponse('Contract not found.', { status: 404 })
    return new NextResponse(r.pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${r.name}"`, 'Cache-Control': 'no-store' } })
}
