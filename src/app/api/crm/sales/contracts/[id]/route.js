import { NextResponse } from 'next/server'
import { getContract } from '@/lib/crm/contractsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await getContract(id))
    } catch (e) {
        return errorResponse(e)
    }
}
