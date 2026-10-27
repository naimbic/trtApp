import { NextResponse } from 'next/server'
import { saveMail, deleteMail } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await saveMail((await params).id, await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { const b = await request.json(); return NextResponse.json(await saveMail((await params).id, b, b.mailId)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteMail((await params).id, request.nextUrl.searchParams.get('mailId'))) } catch (e) { return errorResponse(e) }
}
