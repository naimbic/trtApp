import { NextResponse } from 'next/server'
import { getClientMails, saveClientMail, deleteClientMail } from '@/lib/crm/clientMailsApi'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

// The mails of a client: GET the list · POST log or draft a mail · PUT { mailId, ... } change one · DELETE ?mailId=
export async function GET(_request, { params }) {
    try { return NextResponse.json(await getClientMails((await params).id)) } catch (e) { return errorResponse(e) }
}
export async function POST(request, { params }) {
    try { return NextResponse.json(await saveClientMail((await params).id, await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
export async function PUT(request, { params }) {
    try { const b = await request.json(); return NextResponse.json(await saveClientMail((await params).id, b, b.mailId)) } catch (e) { return errorResponse(e) }
}
export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteClientMail((await params).id, request.nextUrl.searchParams.get('mailId'))) } catch (e) { return errorResponse(e) }
}
