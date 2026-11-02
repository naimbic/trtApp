import { portalPushStatus, portalPushSubscribe, portalPushUnsubscribe, portalPushTest } from '@/lib/portal/push'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET() { try { return json(await portalPushStatus()) } catch (e) { return fail(e) } }
// POST { subscription, userAgent } saves this device · POST { test: true } sends a test · DELETE { endpoint } removes it
export async function POST(request) { try { const b = await request.json().catch(() => ({})); return json(b.test ? await portalPushTest() : await portalPushSubscribe(b)) } catch (e) { return fail(e) } }
export async function DELETE(request) { try { return json(await portalPushUnsubscribe((await request.json().catch(() => ({}))).endpoint)) } catch (e) { return fail(e) } }
