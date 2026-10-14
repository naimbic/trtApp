import { portalChat, portalSend, portalRead } from '@/lib/portal/chat'
import { json, fail } from '@/lib/portal/http'

export async function GET(request) {
    try { return json(await portalChat(request.nextUrl.searchParams.get('after'))) } catch (e) { return fail(e) }
}

export async function POST(request) {
    try {
        const b = await request.json().catch(() => ({}))
        if (b.read) return json(await portalRead())
        return json(await portalSend(b.body), { status: 201 })
    } catch (e) { return fail(e) }
}
