import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { notify, api, upload } from '../kit/api'
import { useTicketFiles, AttachButtons, FileTray, DropHint, messageForm } from '@/components/crm/TicketFiles'
import RelationSelect from '../kit/RelationSelect'

const EMPTY = { clientId: null, contactId: null, email: '', subject: '', message: '', departmentId: null, priorityId: null, assignedId: null, notifyClient: false }
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>

const NewTicketDialog = ({ open, onClose, lookups, onCreated, presets }) => {
    const [v, setV] = useState(EMPTY)
    const [contacts, setContacts] = useState([])
    const [saving, setSaving] = useState(false)
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const tf = useTicketFiles({ notify })
    useEffect(() => { if (open) { setV({ ...EMPTY, ...(presets || {}) }); setContacts([]); tf.clear() } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!v.clientId) { setContacts([]); return }
        api(`/api/crm/support/tickets/contacts?clientId=${v.clientId}`).then((r) => { setContacts(r.list); const p = r.list.find((c) => c.primary) || r.list[0]; if (p && !v.contactId) set({ contactId: p.id }) }).catch(() => {})
    }, [v.clientId]) // eslint-disable-line react-hooks/exhaustive-deps
    const opt = (list = []) => list.map((x) => ({ value: x.id, label: x.name }))
    const pick = (list, val) => opt(list).find((o) => o.value === val) || null
    const co = contacts.map((c) => ({ value: c.id, label: `${c.name}${c.email ? ` · ${c.email}` : ''}` }))
    const save = async () => {
        setSaving(true)
        try {
            const r = await upload('/api/crm/support/tickets', messageForm(v, tf.files))
            notify('success', `Ticket #${r.number} created`)
            if (r.mail?.client && !r.mail.client.sent) notify('warning', r.mail.client.error || 'The client email could not be sent')
            onCreated(r.id)
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    return (
        <Dialog isOpen={open} width={680} onClose={onClose} onRequestClose={onClose}>
            <h4>New ticket</h4>
            <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div><L>Client</L><RelationSelect resource="clients" value={v.clientId} onChange={(x) => set({ clientId: x || null, contactId: null })} /></div>
                    <div><L>Contact</L>{v.clientId ? <Select isClearable options={co} value={co.find((o) => o.value === v.contactId) || null} onChange={(o) => set({ contactId: o?.value || null })} /> : <Input placeholder="Email (no client)" value={v.email} onChange={(e) => set({ email: e.target.value })} />}</div>
                </div>
                <div><L>Subject</L><Input value={v.subject} onChange={(e) => set({ subject: e.target.value })} /></div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div><L>Department</L><Select isClearable options={opt(lookups.departments)} value={pick(lookups.departments, v.departmentId)} onChange={(o) => set({ departmentId: o?.value || null })} /></div>
                    <div><L>Priority</L><Select isClearable options={opt(lookups.priorities)} value={pick(lookups.priorities, v.priorityId)} onChange={(o) => set({ priorityId: o?.value || null })} placeholder="Medium" /></div>
                    <div><L>Assign to</L><Select isClearable options={opt(lookups.staff)} value={pick(lookups.staff, v.assignedId)} onChange={(o) => set({ assignedId: o?.value || null })} /></div>
                </div>
                <div className="relative" {...tf.dropProps}><DropHint tf={tf} /><L>Message</L><Input textArea rows={7} placeholder="Describe the problem. Paste a screenshot (Ctrl+V) or drop files here." value={v.message} onChange={(e) => set({ message: e.target.value })} onPaste={tf.onPaste} /><FileTray tf={tf} /><div className="mt-2"><AttachButtons tf={tf} size="sm" /></div></div>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={v.notifyClient} onChange={(c) => set({ notifyClient: c })} />Email the client that the ticket was opened</label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="solid" loading={saving} disabled={!v.subject.trim() || (!v.message.trim() && !tf.items.length) || (!v.clientId && !v.email.trim())} onClick={save}>Create ticket</Button></div>
        </Dialog>
    )
}

export default NewTicketDialog
