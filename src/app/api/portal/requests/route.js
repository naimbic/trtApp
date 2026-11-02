import { listRequests, createRequest } from '@/lib/portal/requests'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET() { try { return json(await listRequests()) } catch (e) { return fail(e) } }
// POST { title, body, type, priority, url, attachments } sends a request
export async function POST(request) { try { return json(await createRequest(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return fail(e) } }
