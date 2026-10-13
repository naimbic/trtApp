import { NextResponse } from 'next/server'
import { listContracts, saveContract } from '@/lib/crm/contractsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await listContracts(Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        return NextResponse.json(await saveContract(await request.json()), { status: 201 })
    } catch (e) {
        return errorResponse(e)
    }
}
