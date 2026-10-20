import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { addPayment } from '@/lib/crm/payroll'

export async function POST(request) {
    try { return NextResponse.json(await addPayment(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
