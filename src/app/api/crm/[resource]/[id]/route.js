import { NextResponse } from 'next/server'
import { getRecord, updateRecord, deleteRecord, errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { resource, id } = await params
        return NextResponse.json(await getRecord(resource, id))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PATCH(request, { params }) {
    try {
        const { resource, id } = await params
        return NextResponse.json(await updateRecord(resource, id, await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { resource, id } = await params
        return NextResponse.json(await deleteRecord(resource, id))
    } catch (e) {
        return errorResponse(e)
    }
}
