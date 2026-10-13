import { NextResponse } from 'next/server'
import { createMemberLink } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const body = await request.json().catch(() => ({}))
        return NextResponse.json(await createMemberLink(id, body.purpose, request))
    } catch (e) {
        return errorResponse(e)
    }
}
