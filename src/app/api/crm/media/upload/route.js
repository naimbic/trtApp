import { NextResponse } from 'next/server'
import { uploadMedia } from '@/lib/crm/mediaApi'
import { errorResponse } from '@/lib/crm/crud'

export const maxDuration = 60

export async function POST(request) {
    try {
        return NextResponse.json(await uploadMedia(await request.formData()))
    } catch (e) {
        return errorResponse(e)
    }
}
