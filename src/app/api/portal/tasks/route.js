import { listTasks } from '@/lib/portal/tasks'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET() {
    try { return json(await listTasks()) } catch (e) { return fail(e) }
}
