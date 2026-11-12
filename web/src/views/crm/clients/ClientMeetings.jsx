/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useState } from 'react'
import { LeadMeetings } from '../leads/LeadTabs'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

/** The Meetings tab of a client: the same panel as the Meetings tab of a lead. A meeting added here, or booked by an email invitation from the client, is
 *  also on the Calendar; the summary written after it (the report) stays on the client, so the follow-up is tracked. */
const ClientMeetings = ({ clientId, clientName, onChanged }) => {
    const [d, setD] = useState(null)
    const load = useCallback(() => api(`/api/crm/customers/${clientId}/meetings`).then(setD).catch((e) => { notify('danger', e.message); setD({ meetings: [], staff: [], can: { create: false } }) }), [clientId])
    useEffect(() => { load() }, [load])
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); await load(); onChanged?.() } catch (e) { notify('danger', e.message) } }
    if (!d) return <p className="py-6 text-center text-sm text-gray-400">{tr("Loading…")}</p>
    return <LeadMeetings leadId={clientId} leadName={clientName} base={`/api/crm/customers/${clientId}/meetings`} meetings={d.meetings} staff={d.staff} canEdit={d.can.create} run={run} kind="client" />
}

export default ClientMeetings
