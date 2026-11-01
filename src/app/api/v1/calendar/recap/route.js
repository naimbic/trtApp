import { reply } from '../../_run'
import { saveRecap } from '@/lib/crm/meetingRecap'

export const dynamic = 'force-dynamic'

export async function POST(request) {
    try { return reply(await saveRecap(request)) } catch (e) {
        if (!e.status || e.status >= 500) console.error('[recap]', e)
        return reply({ error: e.status && e.status < 500 ? e.message : 'Something went wrong on our side' }, e.status || 500, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {})
    }
}
