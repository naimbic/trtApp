import { listTickets, createTicket } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'
import { readMessageBody } from '@/lib/crm/ticketFiles'

export async function GET() {
    try { return json(await listTickets()) } catch (e) { return fail(e) }
}

export async function POST(request) {
    try { const { body, files } = await readMessageBody(request); return json(await createTicket(body, files), { status: 201 }) } catch (e) { return fail(e) }
}
