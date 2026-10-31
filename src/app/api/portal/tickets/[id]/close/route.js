import { closeTicket, reopenTicket, rateTicket } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

// POST { action: 'close' | 'reopen' | 'rate', rating, comment }
export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        const id = (await params).id
        if (b.action === 'reopen') return json(await reopenTicket(id))
        if (b.action === 'rate') return json(await rateTicket(id, b.rating, b.comment))
        return json(await closeTicket(id))
    } catch (e) { return fail(e) }
}
