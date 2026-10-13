import { NextResponse } from 'next/server'
import { getEstimateDocument, saveEstimate, deleteEstimate } from '@/server/actions/crm/sales/estimates'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { id } = await params
        const doc = await getEstimateDocument(id)
        return doc ? NextResponse.json(doc) : NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params
        const r = await saveEstimate({ ...(await request.json()), id })
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        const r = await deleteEstimate(id)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
