import { reply } from '../../_run'
import { meetingsFeed } from '@/lib/crm/calendarFeed'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try { return reply(await meetingsFeed(request)) } catch (e) {
        if (!e.status || e.status >= 500) console.error('[calendar feed]', e)
        return reply({ error: e.status && e.status < 500 ? e.message : 'Something went wrong on our side' }, e.status || 500, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {})
    }
}
