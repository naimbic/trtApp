import { NextResponse } from 'next/server'
import { staffUpload } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try {
        const form = await request.formData()
        return NextResponse.json(await staffUpload(form.get('file'), form.get('voice') === '1'), { status: 201 })
    } catch (e) { return errorResponse(e) }
}
