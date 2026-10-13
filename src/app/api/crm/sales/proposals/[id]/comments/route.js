import { NextResponse } from 'next/server'
import { addProposalComment, deleteProposalComment } from '@/server/actions/crm/sales/proposals'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const r = await addProposalComment(id, (await request.json()).content)
        return NextResponse.json(r, { status: r.success ? 201 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(request) {
    try {
        return NextResponse.json(await deleteProposalComment(new URL(request.url).searchParams.get('commentId')))
    } catch (e) {
        return errorResponse(e)
    }
}
