import { requirePortal } from '@/lib/portal/session'
import { changePassword } from '@/lib/portal/auth'
import { json, fail, withCookie } from '@/lib/portal/http'

export async function POST(request) {
    try {
        const s = await requirePortal()
        const b = await request.json().catch(() => ({}))
        const { value } = await changePassword(s.contact, b.current, b.password)
        return withCookie(json({ success: true }), value, request)
    } catch (e) { return fail(e) }
}
