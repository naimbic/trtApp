import { portalArticle } from '@/lib/crm/kbApi'
import { requirePortal } from '@/lib/portal/session'
import { trackView } from '@/lib/crm/viewTracking'
import { json, fail } from '@/lib/portal/http'

export async function GET(request, { params }) {
    try {
        await requirePortal()
        const { id } = await params
        const r = await portalArticle(id)
        trackView('kb_article', id, request)
        return json(r)
    } catch (e) { return fail(e) }
}
