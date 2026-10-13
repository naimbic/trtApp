import { dashboard } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function GET() {
    try { return json(await dashboard()) } catch (e) { return fail(e) }
}
