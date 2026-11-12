import { NextResponse } from 'next/server'
import { recordPayment, paymentDefaults } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try { return NextResponse.json(await paymentDefaults((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const r = await recordPayment(id, await request.json())
        return NextResponse.json(r, { status: r.success ? 201 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
