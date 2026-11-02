import { getRequest, commentRequest, changeComment, reopenRequest } from '@/lib/portal/requests'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET(_r, { params }) { try { return json(await getRequest((await params).id)) } catch (e) { return fail(e) } }
// POST { action: 'comment', body, replyToId } · { action: 'edit', commentId, body } · { action: 'delete', commentId } · { action: 'reopen', comment }
export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        const id = (await params).id
        return json(b.action === 'edit' ? await changeComment(id, b) : b.action === 'delete' ? await changeComment(id, b, true) : b.action === 'reopen' ? await reopenRequest(id, b) : await commentRequest(id, b))
    } catch (e) { return fail(e) }
}
