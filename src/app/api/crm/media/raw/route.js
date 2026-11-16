import { errorResponse } from '@/lib/crm/crud'
import { mediaFile } from '@/lib/crm/mediaApi'

export const maxDuration = 60

// The bytes of a file of the file manager, for the person who may open it: "Select" in a message box sends it again as an attachment.
export async function GET(request) {
    try {
        const f = await mediaFile(new URL(request.url).searchParams.get('id'))
        if (f.size > 50 * 1048576) return Response.json({ error: 'This file is larger than 50 MB' }, { status: 400 })
        const r = await fetch(f.url)
        if (!r.ok || !r.body) return Response.json({ error: 'This file is no longer available' }, { status: 404 })
        return new Response(r.body, { headers: { 'content-type': f.mime, 'cache-control': 'private, no-store', 'x-file-name': encodeURIComponent(f.name) } })
    } catch (e) {
        return errorResponse(e)
    }
}
