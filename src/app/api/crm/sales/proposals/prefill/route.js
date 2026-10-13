import { NextResponse } from 'next/server'
import { proposalPrefill } from '@/server/actions/crm/sales/proposals'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const p = new URL(request.url).searchParams
        return NextResponse.json(await proposalPrefill(p.get('relType'), p.get('relId')))
    } catch (e) {
        return errorResponse(e)
    }
}
