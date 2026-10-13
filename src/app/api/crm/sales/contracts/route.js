import { NextResponse } from 'next/server'
import { listContracts } from '@/lib/crm/contractsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await listContracts(Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}
