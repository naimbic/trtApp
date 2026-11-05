/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useState } from 'react'
import { LeadMails } from '../leads/LeadTabs'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

/** The Mails tab of a client: the same as the Mails tab of a lead (log a received or sent mail, drafts with notes and checks, files, send now or at a date and time). */
const ClientMails = ({ clientId }) => {
    const [d, setD] = useState(null)
    const load = useCallback(() => api(`/api/crm/customers/${clientId}/mails`).then(setD).catch((e) => { notify('danger', e.message); setD({ mails: [], senders: [], email: '', can: { edit: false } }) }), [clientId])
    useEffect(() => { load() }, [load])
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); await load() } catch (e) { notify('danger', e.message) } }
    if (!d) return <p className="py-6 text-center text-sm text-gray-400">{tr("Loading…")}</p>
    return <LeadMails kind="client" allowDelete={false} leadId={clientId} base={`/api/crm/customers/${clientId}`} mails={d.mails} senders={d.senders} leadEmail={d.email} canEdit={d.can.edit} run={run} />
}

export default ClientMails
