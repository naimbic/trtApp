import { listTickets, createTicket } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function GET() {
    try { return json(await listTickets()) } catch (e) { return fail(e) }
}

export async function POST(request) {
    try { return json(await createTicket(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return fail(e) }
}
