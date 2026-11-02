import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { uploadRequestFile } from '@/lib/crm/clientRequestsApi'

export const maxDuration = 60

// A screenshot or file for a request: multipart `file`.
export async function POST(request) {
    try {
        const file = (await request.formData()).get('file')
        if (!file || typeof file === 'string') return NextResponse.json({ error: 'Choose a file' }, { status: 400 })
        return NextResponse.json(await uploadRequestFile(file))
    } catch (e) { return errorResponse(e) }
}
