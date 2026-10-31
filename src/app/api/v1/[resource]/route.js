import { run } from '../_run'
import { listRows, writeRow } from '@/lib/crm/apiV1'

const body = async (request) => request.json().catch(() => { throw Object.assign(new Error('Send a valid JSON body'), { status: 400 }) })
export const GET = (request, { params }) => run(request, params, 'read', ({ resource }) => listRows(resource, new URL(request.url).searchParams))
export const POST = (request, { params }) => run(request, params, 'write', async ({ resource, key }) => writeRow(resource, null, await body(request), key))
