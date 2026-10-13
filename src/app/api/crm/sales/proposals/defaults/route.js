import { NextResponse } from 'next/server'
import { getProposalDefaults } from '@/server/actions/crm/sales/proposals'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await getProposalDefaults())
    } catch (e) {
        return errorResponse(e)
    }
}
