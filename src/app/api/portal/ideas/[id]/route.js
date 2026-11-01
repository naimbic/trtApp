import { getIdea, answerIdea, commentIdea, changeComment } from '@/lib/portal/ideas'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
    try { return json(await getIdea((await params).id)) } catch (e) { return fail(e) }
}
// POST { action: 'answer', answer: 'interested' | 'approved' | 'declined', comment } or { action: 'comment', body, replyToId } or { action: 'edit', commentId, body } or { action: 'delete', commentId }
export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        const id = (await params).id
        return json(b.action === 'comment' ? await commentIdea(id, b) : b.action === 'edit' ? await changeComment(id, b) : b.action === 'delete' ? await changeComment(id, b, true) : await answerIdea(id, b))
    } catch (e) { return fail(e) }
}
