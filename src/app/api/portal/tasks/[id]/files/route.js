import { addTaskFiles } from '@/lib/portal/tasks'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST multipart: files[] added to the task by the client
export async function POST(request, { params }) {
    try { return json(await addTaskFiles((await params).id, await request.formData())) } catch (e) { return fail(e) }
}
