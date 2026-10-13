import { NextResponse } from 'next/server'
import { signOutMember } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await signOutMember(id))
    } catch (e) {
        return errorResponse(e)
    }
}
