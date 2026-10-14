import { NextResponse } from 'next/server'
import { uploadOwnAvatar, removeOwnAvatar } from '@/lib/crm/profile'
import { readImageInput } from '@/lib/media'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try {
        return NextResponse.json(await uploadOwnAvatar(await readImageInput(request)))
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
