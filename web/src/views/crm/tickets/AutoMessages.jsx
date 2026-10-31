import { useEffect, useState } from 'react'
import { TbRobot } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Checkbox from '@/components/ui/Checkbox'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

/** The automatic messages: for each ticket status (and for "request received"), a message sent to the client the moment a ticket gets that status. */
const AutoMessages = ({ open, onClose }) => {
    const [d, setD] = useState(null)
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) { setD(null); api('/api/crm/support/auto-messages').then(setD).catch((e) => { notify('danger', e.message); onClose() }) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    const set = (on, p) => setD((x) => ({ ...x, rules: x.rules.map((r) => (r.on === on ? { ...r, ...p } : r)) }))
    const save = async () => {
        setBusy(true)
        try { await api('/api/crm/support/auto-messages', { method: 'PUT', body: { rules: d.rules } }); notify('success', tr("Automatic messages saved")); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={760} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-1 flex items-center gap-2"><TbRobot />{tr("Automatic messages")}</h5>
            <p className="mb-4 text-sm text-gray-500">{tr("When a ticket gets a status, the client receives the message you write here, in the conversation and/or by email. Use the fields to personalise it.")}</p>
            {!d ? <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div> : (
                <div className="max-h-[60vh] space-y-3 overflow-y-auto pe-1">
                    {d.rules.map((r) => (
                        <div key={r.on} className={`rounded-xl border p-3 ${r.enabled ? 'border-primary/40 bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}>
                            <label className="flex cursor-pointer items-center gap-3"><Switcher checked={r.enabled} onChange={(c) => set(r.on, { enabled: c })} />{r.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />}<span className="font-semibold">{r.on === 'created' ? tr("When a request is received (created by the client)") : r.title}</span></label>
                            {r.enabled && (
                                <div className="mt-3 space-y-2">
                                    <Input textArea rows={4} value={r.message} placeholder={tr("Hello {contact_firstname}, your request #{ticket_id} is now {ticket_status}.")} onChange={(e) => set(r.on, { message: e.target.value })} />
                                    <div className="flex flex-wrap gap-1.5">{d.fields.map((f) => <button key={f} type="button" className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-primary/10 hover:text-primary dark:bg-gray-700 dark:text-gray-300" onClick={() => set(r.on, { message: `${r.message}{${f}}` })}>{`{${f}}`}</button>)}</div>
                                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm"><Checkbox checked={r.thread} onChange={(c) => set(r.on, { thread: c })}>{tr("Write it in the conversation")}</Checkbox><Checkbox checked={r.email} onChange={(c) => set(r.on, { email: c })}>{tr("Email it to the client")}</Checkbox></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>{tr("Cancel")}</Button><Button variant="solid" loading={busy} disabled={!d} onClick={save}>{tr("Save")}</Button></div>
        </Dialog>
    )
}

export default AutoMessages
