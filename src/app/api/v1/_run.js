import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/crm/apiKeys'
import { RESOURCES } from '@/lib/crm/apiV1'

const HEAD = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
export const reply = (body, status = 200, extra = {}) => NextResponse.json(body, { status, headers: { ...HEAD, ...extra } })

/** One call of the public API: finds the resource, checks the key and its scope, runs it, writes the log line, shapes errors the same way everywhere. */
export async function run(request, params, kind, work) {
    let auth = null
    try {
        const { resource, id } = await params
        const r = RESOURCES[resource]
        if (!r) return reply({ error: 'Unknown resource', resources: Object.keys(RESOURCES) }, 404)
        const scope = kind === 'read' ? r.read : r.write
        if (!scope) return reply({ error: 'This resource is read-only' }, 405, { Allow: 'GET' })
        auth = await authenticate(request, scope)
        const out = await work({ resource, id, key: auth.key })
        auth.log(out.created ? 201 : 200)
        return reply(out, out.created ? 201 : 200)
    } catch (e) {
        const status = e.status || 500
        auth?.log(status)
        if (status >= 500) console.error('[api v1]', e)
        return reply({ error: status >= 500 ? 'Something went wrong on our side' : e.message }, status, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {})
    }
}
