import { listProjects } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function GET() {
    try { return json(await listProjects()) } catch (e) { return fail(e) }
}
