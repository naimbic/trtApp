import { NextResponse } from 'next/server'
import { getEstimateDefaults } from '@/server/actions/crm/sales/estimates'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await getEstimateDefaults())
    } catch (e) {
        return errorResponse(e)
    }
}
