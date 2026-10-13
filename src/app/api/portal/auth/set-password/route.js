import { inspectKey, setPasswordWithKey } from '@/lib/portal/auth'
import { json, fail, withCookie } from '@/lib/portal/http'

export async function GET(request) {
    try { return json(await inspectKey(request.nextUrl.searchParams.get('key'))) } catch (e) { return fail(e) }
}

export async function POST(request) {
    try {
        const b = await request.json().catch(() => ({}))
        const { value, first } = await setPasswordWithKey(b.key, b.password)
        return withCookie(json({ success: true, first }), value, request)
    } catch (e) { return fail(e) }
}
