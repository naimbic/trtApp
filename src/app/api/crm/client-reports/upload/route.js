import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { uploadReportFile } from '@/lib/crm/clientReportsApi'

export const maxDuration = 60

// A file for a report or a strategy: multipart `file`.
export async function POST(request) {
    try {
        const file = (await request.formData()).get('file')
        if (!file || typeof file === 'string') return NextResponse.json({ error: 'Choose a file' }, { status: 400 })
        return NextResponse.json(await uploadReportFile(file))
    } catch (e) { return errorResponse(e) }
}
