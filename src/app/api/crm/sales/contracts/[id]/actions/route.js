import { NextResponse } from 'next/server'
import { contractAction } from '@/lib/crm/contractsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await contractAction(id, await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}
