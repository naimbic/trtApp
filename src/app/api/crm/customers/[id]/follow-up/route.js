import { NextResponse } from 'next/server'
import { addFollowUp, deleteReminder } from '@/lib/crm/clientProfileApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await addFollowUp((await params).id, await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteReminder((await params).id, request.nextUrl.searchParams.get('reminderId'))) } catch (e) { return errorResponse(e) }
}
