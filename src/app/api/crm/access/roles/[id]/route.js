import { NextResponse } from 'next/server'
import { updateRole, deleteRole } from '@/lib/crm/access'
import { errorResponse } from '@/lib/crm/crud'

export async function PATCH(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await updateRole(id, await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await deleteRole(id))
    } catch (e) {
        return errorResponse(e)
    }
}
