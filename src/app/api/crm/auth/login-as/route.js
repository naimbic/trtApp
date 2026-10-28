import { NextResponse } from 'next/server'
import { startLoginAs, stopLoginAs } from '@/lib/crm/loginAs'
import { errorResponse } from '@/lib/crm/crud'

// POST { staffId }: open the CRM as that team member. DELETE: back to your own account.
export async function POST(request) {
    try {
        const b = await request.json().catch(() => ({}))
        return NextResponse.json(await startLoginAs(b.staffId))
    } catch (e) { return errorResponse(e) }
}

export async function DELETE() {
    try { return NextResponse.json(await stopLoginAs()) } catch (e) { return errorResponse(e) }
}
