import { portalFeedback } from '@/lib/crm/kbApi'
import { requirePortal } from '@/lib/portal/session'
import { requestIp } from '@/lib/crm/viewTracking'
import { json, fail } from '@/lib/portal/http'

export async function POST(request, { params }) {
    try {
        await requirePortal()
        const b = await request.json().catch(() => ({}))
        return json(await portalFeedback((await params).id, !!b.helpful, requestIp(request)))
    } catch (e) { return fail(e) }
}
