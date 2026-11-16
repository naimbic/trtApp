import { NextResponse } from 'next/server'
import { deletePoint } from '@/lib/crm/pointsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function DELETE(_request, { params }) {
    try { return NextResponse.json(await deletePoint((await params).id)) } catch (e) { return errorResponse(e) }
}
