import { reply } from '../../../_run'
import { getAppointment } from '@/lib/crm/appointments'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
    try { return reply(await getAppointment(request, (await params).id)) } catch (e) {
        if (!e.status || e.status >= 500) console.error('[appointment]', e)
        return reply({ error: e.status && e.status < 500 ? e.message : 'Something went wrong on our side' }, e.status || 500)
    }
}
