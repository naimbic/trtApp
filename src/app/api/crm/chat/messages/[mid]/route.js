import { NextResponse } from 'next/server'
import { messageAction } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await messageAction((await params).mid, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}
