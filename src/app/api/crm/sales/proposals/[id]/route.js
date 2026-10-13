import { NextResponse } from 'next/server'
import { getProposalDocument, saveProposal, deleteProposal } from '@/server/actions/crm/sales/proposals'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { id } = await params
        const doc = await getProposalDocument(id)
        return doc ? NextResponse.json(doc) : NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params
        const r = await saveProposal({ ...(await request.json()), id })
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        const r = await deleteProposal(id)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
