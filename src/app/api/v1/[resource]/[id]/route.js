import { run } from '../../_run'
import { getRow, writeRow } from '@/lib/crm/apiV1'

const body = async (request) => request.json().catch(() => { throw Object.assign(new Error('Send a valid JSON body'), { status: 400 }) })
export const GET = (request, { params }) => run(request, params, 'read', ({ resource, id }) => getRow(resource, id))
export const PATCH = (request, { params }) => run(request, params, 'write', async ({ resource, id, key }) => writeRow(resource, id, await body(request), key))
