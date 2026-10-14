import { NextResponse } from 'next/server'
import { uploadStaffAvatar, removeStaffAvatar } from '@/lib/crm/profile'
import { readImageInput } from '@/lib/media'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await uploadStaffAvatar(id, await readImageInput(request)))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await removeStaffAvatar(id))
    } catch (e) {
        return errorResponse(e)
    }
}
