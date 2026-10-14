import { portalSignals, portalSendSignal } from '@/lib/portal/chat'
import { json, fail } from '@/lib/portal/http'

export async function GET() {
    try { return json(await portalSignals()) } catch (e) { return fail(e) }
}

export async function POST(request) {
    try { return json(await portalSendSignal(await request.json().catch(() => ({})))) } catch (e) { return fail(e) }
}
