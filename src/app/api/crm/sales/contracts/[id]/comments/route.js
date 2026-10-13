import { NextResponse } from 'next/server'
import { addContractComment, deleteContractComment } from '@/lib/crm/contractsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const { content } = await request.json()
        return NextResponse.json(await addContractComment(id, content), { status: 201 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await deleteContractComment(id, request.nextUrl.searchParams.get('commentId')))
    } catch (e) {
        return errorResponse(e)
    }
}
