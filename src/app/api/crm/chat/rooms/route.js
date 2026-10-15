import { NextResponse } from 'next/server'
import { listRooms, openDirect, createGroup } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await listRooms()) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try {
        const b = await request.json().catch(() => ({}))
        return NextResponse.json(b.group ? await createGroup(b.group.name, b.group.staffIds) : await openDirect(b.staffId))
    } catch (e) { return errorResponse(e) }
}
