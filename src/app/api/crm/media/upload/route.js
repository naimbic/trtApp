import { NextResponse } from 'next/server'
import { uploadMedia } from '@/lib/crm/mediaApi'
import { errorResponse } from '@/lib/crm/crud'
import { requirePermission } from '@/lib/crm/permissions'
import { rateLimit } from '@/lib/rateLimit'

export const maxDuration = 60

export async function POST(request) {
    try {
        const session = await requirePermission(null) // signed in first, then read the body
        rateLimit(`upload:${session.user.id}`, 40, 60000)
        return NextResponse.json(await uploadMedia(await request.formData()))
    } catch (e) {
        return errorResponse(e)
    }
}
