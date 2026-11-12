import { NextResponse } from 'next/server'
import { getClientMeetings, saveClientMeeting, deleteClientMeeting } from '@/lib/crm/clientMeetingsApi'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

// The meetings of a client: GET the list · POST add one · PUT { eventId, ... } change one (or write its report) · DELETE ?eventId=
export async function GET(_request, { params }) {
    try { return NextResponse.json(await getClientMeetings((await params).id)) } catch (e) { return errorResponse(e) }
}
export async function POST(request, { params }) {
    try { return NextResponse.json(await saveClientMeeting((await params).id, await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
export async function PUT(request, { params }) {
    try { const b = await request.json(); return NextResponse.json(await saveClientMeeting((await params).id, b, b.eventId)) } catch (e) { return errorResponse(e) }
}
export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteClientMeeting((await params).id, request.nextUrl.searchParams.get('eventId'))) } catch (e) { return errorResponse(e) }
}
