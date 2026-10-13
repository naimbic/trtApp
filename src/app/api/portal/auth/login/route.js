import { portalLogin } from '@/lib/portal/auth'
import { json, fail, withCookie } from '@/lib/portal/http'

export async function POST(request) {
    try {
        const b = await request.json().catch(() => ({}))
        const { value, contact } = await portalLogin(b.email, b.password, request)
        return withCookie(json({ success: true, name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') }), value, request)
    } catch (e) { return fail(e) }
}
