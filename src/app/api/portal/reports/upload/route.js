import { uploadReportFile } from '@/lib/portal/reports'
import { json, fail } from '@/lib/portal/http'

export const maxDuration = 60

// A screenshot or file for a message on a report or strategy, from the client area: multipart `file`.
export async function POST(request) {
    try {
        const file = (await request.formData()).get('file')
        if (!file || typeof file === 'string') return json({ error: 'Choose a file' }, { status: 400 })
        return json(await uploadReportFile(file))
    } catch (e) { return fail(e) }
}
