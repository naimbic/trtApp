import { portalHub } from '@/lib/crm/kbApi'
import { requirePortal } from '@/lib/portal/session'
import { json, fail } from '@/lib/portal/http'

export async function GET(request) {
    try { await requirePortal(); return json(await portalHub(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return fail(e) }
}
