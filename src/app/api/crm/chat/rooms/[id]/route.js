import { NextResponse } from 'next/server'
import { roomMessages, sendMessage, updateGroup, deleteGroup } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try { return NextResponse.json(await roomMessages((await params).id, request.nextUrl.searchParams.get('after'))) } catch (e) { return errorResponse(e) }
}

export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        return NextResponse.json(await sendMessage((await params).id, b.body, b.attachment, b.replyTo), { status: 201 })
    } catch (e) { return errorResponse(e) }
}

export async function PATCH(request, { params }) {
    try { return NextResponse.json(await updateGroup((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteGroup((await params).id)) } catch (e) { return errorResponse(e) }
}
