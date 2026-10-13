import { NextResponse } from 'next/server'
import { convertProposal } from '@/server/actions/crm/sales/proposals'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const { to } = await request.json()
        const r = await convertProposal(id, to === 'invoice' ? 'invoice' : 'estimate')
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
