import { NextResponse } from 'next/server'
import { uploadStaffAvatar, removeStaffAvatar } from '@/lib/crm/profile'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const form = await request.formData()
        return NextResponse.json(await uploadStaffAvatar(id, form.get('file')))
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
