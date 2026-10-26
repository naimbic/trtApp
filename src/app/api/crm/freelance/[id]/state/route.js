import { NextResponse } from 'next/server'
import { setFreelanceState } from '@/lib/crm/freelanceApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const b = await request.json()
        return NextResponse.json(await setFreelanceState((await params).id, b.action, b.paidDate))
    } catch (e) { return errorResponse(e) }
}
