import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { updatePayment, deletePayment } from '@/lib/crm/payroll'

export async function PATCH(request, { params }) {
    try { return NextResponse.json(await updatePayment((await params).id, await request.json())) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deletePayment((await params).id)) } catch (e) { return errorResponse(e) }
}
