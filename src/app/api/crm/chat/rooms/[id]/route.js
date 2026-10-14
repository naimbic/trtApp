import { NextResponse } from 'next/server'
import { roomMessages, sendMessage } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try { return NextResponse.json(await roomMessages((await params).id, request.nextUrl.searchParams.get('after'))) } catch (e) { return errorResponse(e) }
}

export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        return NextResponse.json(await sendMessage((await params).id, b.body, b.attachment), { status: 201 })
    } catch (e) { return errorResponse(e) }
}
