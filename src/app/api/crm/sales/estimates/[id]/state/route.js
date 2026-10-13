import { NextResponse } from 'next/server'
import { setEstimateState } from '@/server/actions/crm/sales/estimates'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const r = await setEstimateState(id, (await request.json()).action)
        return NextResponse.json(r, { status: r.success ? 200 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
