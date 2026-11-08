import { listReports } from '@/lib/portal/reports'
import { json, fail } from '@/lib/portal/http'

export const dynamic = 'force-dynamic'

export async function GET() { try { return json(await listReports()) } catch (e) { return fail(e) } }
