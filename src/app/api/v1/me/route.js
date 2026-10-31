import { reply } from '../_run'
import { authenticate, SCOPES } from '@/lib/crm/apiKeys'

/** Who am I: the name and the scopes of the key (a quick way to test it). */
export async function GET(request) {
    try {
        const { key, log } = await authenticate(request)
        log(200)
        return reply({ data: { name: key.name, scopes: key.scopes, expires_at: key.expiresAt, all_scopes: SCOPES.map(([id]) => id) } })
    } catch (e) { return reply({ error: e.message }, e.status || 500) }
}
