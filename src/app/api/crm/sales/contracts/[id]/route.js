import { NextResponse } from 'next/server'
import { getContract, saveContract, deleteContract } from '@/lib/crm/contractsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await getContract(id))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await saveContract(await request.json(), id))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        return NextResponse.json(await deleteContract((await params).id))
    } catch (e) {
        return errorResponse(e)
    }
}
