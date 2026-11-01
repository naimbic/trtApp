import { reply } from '../../../_run'
import { getAppointment, editByKey, deleteByKey } from '@/lib/crm/appointments'

export const dynamic = 'force-dynamic'

const fail = (e) => {
    if (!e.status || e.status >= 500) console.error('[appointment]', e)
    return reply({ error: e.status && e.status < 500 ? e.message : 'Something went wrong on our side' }, e.status || 500, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {})
}

export async function GET(request, { params }) { try { return reply(await getAppointment(request, (await params).id)) } catch (e) { return fail(e) } }
export async function PATCH(request, { params }) { try { return reply(await editByKey(request, (await params).id)) } catch (e) { return fail(e) } }
export async function DELETE(request, { params }) { try { return reply(await deleteByKey(request, (await params).id)) } catch (e) { return fail(e) } }
