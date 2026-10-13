import { NextResponse } from 'next/server'
import { addEstimateComment, deleteEstimateComment } from '@/server/actions/crm/sales/estimates'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const r = await addEstimateComment(id, (await request.json()).content)
        return NextResponse.json(r, { status: r.success ? 201 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(request) {
    try {
        return NextResponse.json(await deleteEstimateComment(new URL(request.url).searchParams.get('commentId')))
    } catch (e) {
        return errorResponse(e)
    }
}
