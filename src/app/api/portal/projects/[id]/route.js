import { getProject } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function GET(_r, { params }) {
    try { return json(await getProject((await params).id)) } catch (e) { return fail(e) }
}
