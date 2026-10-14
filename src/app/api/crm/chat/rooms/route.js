import { NextResponse } from 'next/server'
import { listRooms, openDirect } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await listRooms()) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await openDirect((await request.json().catch(() => ({}))).staffId)) } catch (e) { return errorResponse(e) }
}
