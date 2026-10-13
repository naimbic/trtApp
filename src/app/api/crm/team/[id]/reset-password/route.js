import { NextResponse } from 'next/server'
import { resetMemberPassword } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await resetMemberPassword(id))
    } catch (e) {
        return errorResponse(e)
    }
}
