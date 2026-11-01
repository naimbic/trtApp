import { reply } from '../../_run'
import { busyFeed } from '@/lib/crm/calendarFeed'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try { return reply(await busyFeed(request)) } catch (e) {
        if (!e.status || e.status >= 500) console.error('[calendar busy]', e)
        return reply({ error: e.status && e.status < 500 ? e.message : 'Something went wrong on our side' }, e.status || 500, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {})
    }
}
