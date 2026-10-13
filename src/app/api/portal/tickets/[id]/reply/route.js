import { replyTicket } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function POST(request, { params }) {
    try { return json(await replyTicket((await params).id, (await request.json().catch(() => ({}))).message)) } catch (e) { return fail(e) }
}
