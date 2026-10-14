import { NextResponse } from 'next/server'
import { setContactPassword } from '@/lib/portal/auth'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        return NextResponse.json(await setContactPassword((await params).id, b.contactId, b.password))
    } catch (e) { return errorResponse(e) }
}
