import { NextResponse } from 'next/server'
import { updateMember } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function PATCH(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await updateMember(id, await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}
