import { NextResponse } from 'next/server'
import { setProposalState } from '@/server/actions/crm/sales/proposals'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const r = await setProposalState(id, (await request.json()).action)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
