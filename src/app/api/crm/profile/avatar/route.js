import { NextResponse } from 'next/server'
import { uploadOwnAvatar, removeOwnAvatar } from '@/lib/crm/profile'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try {
        const form = await request.formData()
        return NextResponse.json(await uploadOwnAvatar(form.get('file')))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE() {
    try {
        return NextResponse.json(await removeOwnAvatar())
    } catch (e) {
        return errorResponse(e)
    }
}
