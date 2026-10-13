import { NextResponse } from 'next/server'
import { getStaffAccess, setStaffAccess } from '@/lib/crm/access'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await getStaffAccess(id))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await setStaffAccess(id, await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}
