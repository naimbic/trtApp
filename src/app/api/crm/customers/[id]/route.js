import { NextResponse } from 'next/server'
import { getClientDetail, updateClient, deleteClient } from '@/lib/crm/clientsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await getClientDetail(id))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PATCH(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await updateClient(id, await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await deleteClient(id))
    } catch (e) {
        return errorResponse(e)
    }
}
