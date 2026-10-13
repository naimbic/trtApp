import { listEstimates } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function GET() {
    try { return json(await listEstimates()) } catch (e) { return fail(e) }
}
