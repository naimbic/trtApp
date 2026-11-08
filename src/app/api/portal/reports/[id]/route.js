import { getReport, commentReport, changeComment, answerReport } from '@/lib/portal/reports'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET(_r, { params }) { try { return json(await getReport((await params).id)) } catch (e) { return fail(e) } }
// POST { action: 'comment', body, replyToId } · { action: 'edit', commentId, body } · { action: 'delete', commentId } · { action: 'answer', answer: 'approve'|'changes'|'decline', comment }
export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        const id = (await params).id
        return json(b.action === 'edit' ? await changeComment(id, b) : b.action === 'delete' ? await changeComment(id, b, true) : b.action === 'answer' ? await answerReport(id, b) : await commentReport(id, b))
    } catch (e) { return fail(e) }
}
