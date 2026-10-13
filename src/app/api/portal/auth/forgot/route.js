import { requestReset } from '@/lib/portal/auth'
import { json, fail } from '@/lib/portal/http'

export async function POST(request) {
    try { return json(await requestReset((await request.json().catch(() => ({}))).email)) } catch (e) { return fail(e) }
}
