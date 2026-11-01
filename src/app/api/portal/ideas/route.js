import { listIdeas } from '@/lib/portal/ideas'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET() {
    try { return json(await listIdeas()) } catch (e) { return fail(e) }
}
