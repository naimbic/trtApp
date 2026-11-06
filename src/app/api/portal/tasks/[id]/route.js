import { getTask, commentTask } from '@/lib/portal/tasks'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET(_r, { params }) { try { return json(await getTask((await params).id)) } catch (e) { return fail(e) } }
// POST { content, replyToId }: the client writes on the task
export async function POST(request, { params }) {
    try { return json(await commentTask((await params).id, await request.json().catch(() => ({})))) } catch (e) { return fail(e) }
}
