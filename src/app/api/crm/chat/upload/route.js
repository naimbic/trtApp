import { NextResponse } from 'next/server'
import { staffUpload } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'
import { requirePermission } from '@/lib/crm/permissions'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request) {
    try {
        const session = await requirePermission(null) // signed in first, then read the body
        rateLimit(`upload:${session.user.id}`, 40, 60000)
        const form = await request.formData()
        return NextResponse.json(await staffUpload(form.get('file'), form.get('voice') === '1'), { status: 201 })
    } catch (e) { return errorResponse(e) }
}
