import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { uploadNoteFile } from '@/lib/crm/notesApi'

export const maxDuration = 60

// A picture, voice note or file for a note: multipart `file` (+ `voice=1` for a recording).
export async function POST(request) {
    try {
        const fd = await request.formData()
        const file = fd.get('file')
        if (!file || typeof file === 'string') return NextResponse.json({ error: 'Choose a file' }, { status: 400 })
        return NextResponse.json(await uploadNoteFile(file, fd.get('voice') === '1'))
    } catch (e) {
        return errorResponse(e)
    }
}
