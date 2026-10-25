import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { requirePermission } from '@/lib/crm/permissions'
import { rateLimit } from '@/lib/rateLimit'
import { processUpload, putMedia, MediaError } from '@/lib/media'

export const maxDuration = 60

// A picture pasted, dropped or chosen inside a text editor (task description, comment, note): any signed-in team member, images only.
export async function POST(request) {
    try {
        const session = await requirePermission(null)
        rateLimit(`inline:${session.user.id}`, 40, 60000)
        const file = (await request.formData()).get('file')
        if (!file || typeof file === 'string') return NextResponse.json({ error: 'Choose a picture' }, { status: 400 })
        try {
            const p = await processUpload(file, { purpose: 'attachment', imageOnly: true })
            const { url } = await putMedia(p, 'editor')
            return NextResponse.json({ url, name: p.name })
        } catch (e) {
            if (e instanceof MediaError) return NextResponse.json({ error: e.message }, { status: 400 })
            throw e
        }
    } catch (e) {
        return errorResponse(e)
    }
}
