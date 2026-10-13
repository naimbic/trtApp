import { NextResponse } from 'next/server'
import { listProposals } from '@/lib/crm/proposalsApi'
import { saveProposal } from '@/server/actions/crm/sales/proposals'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await listProposals(Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        const r = await saveProposal(await request.json())
        return NextResponse.json(r, { status: r.success ? 201 : 400 })
    } catch (e) {
        return errorResponse(e)
    }
}
