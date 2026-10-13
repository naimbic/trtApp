import { NextResponse } from 'next/server'
import { inviteContact } from '@/lib/portal/auth'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        return NextResponse.json(await inviteContact((await params).id, b.contactId))
    } catch (e) { return errorResponse(e) }
}
