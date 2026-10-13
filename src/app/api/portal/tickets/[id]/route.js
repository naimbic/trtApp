import { getTicket } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function GET(_r, { params }) {
    try { return json(await getTicket((await params).id)) } catch (e) { return fail(e) }
}
