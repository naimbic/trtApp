import { NextResponse } from 'next/server'
import { uploadMedia } from '@/lib/crm/mediaApi'
import { errorResponse } from '@/lib/crm/crud'
import { requirePermission } from '@/lib/crm/permissions'

export const maxDuration = 60

export async function POST(request) {
    try {
        await requirePermission(null) // signed in first, then read the body
        return NextResponse.json(await uploadMedia(await request.formData()))
    } catch (e) {
        return errorResponse(e)
    }
}
