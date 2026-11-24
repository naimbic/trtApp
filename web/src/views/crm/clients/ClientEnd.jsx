/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import { TbBan } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { api, notify } from '../kit/api'
import { ENDS, useEndColors, useLeadEnds } from '../leads/ends'
import { tr } from '@/utils/t'

/** Saves the end of a client (lost, junk or refused, with the report of why); an empty status reopens it. */
export const saveClientEnd = (id, status, reason = '') => api(`/api/crm/customers/${id}/close`, { method: 'POST', body: { status, reason } })

/** The small coloured label of a closed client. */
export const ClientEndTag = ({ status, className = '' }) => {
    const ends = useLeadEnds()
    const colors = useEndColors()
    if (!ENDS.includes(status)) return null
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${className}`} style={colors[status].tag}>{ends[status]}</span>
}

/** The box to close a client: choose lost, junk or refused and write the report of why. `client` = { id, company, endStatus, endReason } (or null when closed). */
const ClientEndDialog = ({ client, onClose, onSaved }) => {
    const ends = useLeadEnds()
    const colors = useEndColors()
    const [status, setStatus] = useState('lost')
    const [reason, setReason] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (client) { setStatus(ENDS.includes(client.endStatus) ? client.endStatus : 'lost'); setReason(client.endReason || '') } }, [client])
    const save = async () => {
        setBusy(true)
        try {
            await saveClientEnd(client.id, status, reason)
            notify('success', tr("{name} marked as {status}", { name: client.company, status: ends[status] }))
            onSaved?.(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={!!client} width={520} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-1">{tr("Close this client")}</h5>
            <p className="mb-4 text-sm text-gray-500">{client?.company} · {tr("The client becomes inactive. You can reopen it at any time.")}</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
                {ENDS.map((k) => (
                    <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)} className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${status === k ? '' : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300'}`} style={status === k ? { borderColor: colors[k].color, ...colors[k].tag } : undefined}>
                        <TbBan style={{ color: colors[k].color }} />{ends[k]}
                    </button>
                ))}
            </div>
            <label className="form-label mb-1 block">{tr("Report: why?")}</label>
            <Input textArea rows={5} autoFocus maxLength={4000} placeholder={tr("What happened, what was said, what we could have done differently…")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
                <Button size="sm" onClick={onClose}>{tr("Cancel")}</Button>
                <Button size="sm" variant="solid" loading={busy} onClick={save}>{tr("Save")}</Button>
            </div>
        </Dialog>
    )
}

export default ClientEndDialog
