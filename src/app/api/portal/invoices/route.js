import { listInvoices } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function GET() {
    try { return json(await listInvoices()) } catch (e) { return fail(e) }
}
