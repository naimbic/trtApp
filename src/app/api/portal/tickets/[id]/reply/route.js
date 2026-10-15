import { replyTicket } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'
import { readMessageBody } from '@/lib/crm/ticketFiles'

export async function POST(request, { params }) {
    try { const { body, files } = await readMessageBody(request); return json(await replyTicket((await params).id, body.message, files)) } catch (e) { return fail(e) }
}
