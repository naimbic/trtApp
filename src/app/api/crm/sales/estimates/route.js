import { NextResponse } from 'next/server'
import { listEstimates } from '@/lib/crm/estimatesApi'
import { saveEstimate } from '@/server/actions/crm/sales/estimates'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await listEstimates(Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        const r = await saveEstimate(await request.json())
        return NextResponse.json(r, { status: r.success ? 201 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
