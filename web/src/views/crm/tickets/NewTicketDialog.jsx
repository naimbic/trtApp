import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import RichEditor from '@/components/crm/RichEditor'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import AccordionCard from '@/components/crm/AccordionCard'
import { notify, api, upload } from '../kit/api'
import { useTicketFiles, AttachButtons, FileTray, DropHint, messageForm } from '@/components/crm/TicketFiles'
import RelationSelect from '../kit/RelationSelect'
import { tr } from '@/utils/t'

const EMPTY = { clientId: null, contactId: null, email: '', subject: '', message: '', departmentId: null, priorityId: null, assignedId: null, notifyClient: false }
const L = ({ children }) => <label className="form-label mb-1 block">{children}</label>

const NewTicketDialog = ({ open, onClose, lookups, onCreated, presets }) => {
    const [v, setV] = useState(EMPTY)
    const [contacts, setContacts] = useState([])
    const [saving, setSaving] = useState(false)
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const tf = useTicketFiles({ notify })
    useEffect(() => { if (open) { setV({ ...EMPTY, ...(presets || {}) }); setContacts([]); tf.clear() } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    // assigned to the person who opens the ticket by default (the lookups may arrive after the dialog opens)
    useEffect(() => { if (open && lookups?.me && !presets?.assignedId) setV((x) => (x.assignedId ? x : { ...x, assignedId: lookups.me })) }, [open, lookups?.me]) // eslint-disable-line react-hooks/exhaustive-deps
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
            notify('success', tr("Ticket #{number} created", { number: r.number }))
            if (r.mail?.client && !r.mail.client.sent) notify('warning', r.mail.client.error || tr("The client email could not be sent"))
            onCreated(r.id)
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    return (
        <Dialog isOpen={open} width={960} onClose={onClose} onRequestClose={onClose}>
            <h4>{tr("New ticket")}</h4>
            {/* same layout as the sales forms: the subject and the message wide on the left, the settings in small cards on the right (switch at the top right). One column on small screens */}
            <div className="mt-4 grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
                <div className="flex min-w-0 flex-col gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"><L>{tr("Subject")}</L><Input className="text-base font-semibold" value={v.subject} onChange={(e) => set({ subject: e.target.value })} /></div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"><div className="relative" {...tf.dropProps}><DropHint tf={tf} /><L>{tr("Message")}</L><div onPaste={tf.onPaste}><RichEditor minHeight={220} images={false} mentions={false} placeholder={tr("Describe the problem. Paste a screenshot (Ctrl+V) or drop files here.")} value={v.message} onChange={(h) => set({ message: h })} /></div><FileTray tf={tf} /><div className="mt-2"><AttachButtons tf={tf} size="sm" /></div></div></div>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="w-full"><L>{tr("Client")}</L><RelationSelect resource="clients" value={v.clientId} onChange={(x) => set({ clientId: x || null, contactId: null })} /></div>
                        <div className="w-full"><L>{tr("Contact")}</L>{v.clientId ? <Select isClearable options={co} value={co.find((o) => o.value === v.contactId) || null} onChange={(o) => set({ contactId: o?.value || null })} /> : <Input placeholder={tr("Email (no client)")} value={v.email} onChange={(e) => set({ email: e.target.value })} />}</div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="w-full"><L>{tr("Department")}</L><Select isClearable options={opt(lookups.departments)} value={pick(lookups.departments, v.departmentId)} onChange={(o) => set({ departmentId: o?.value || null })} /></div>
                        <div className="min-w-[110px] flex-1"><L>{tr("Priority")}</L><Select isClearable options={opt(lookups.priorities)} value={pick(lookups.priorities, v.priorityId)} onChange={(o) => set({ priorityId: o?.value || null })} placeholder={tr("Medium")} /></div>
                        <div className="min-w-[130px] flex-1"><L>{tr("Assign to")}</L><Select isClearable options={opt(lookups.staff)} value={pick(lookups.staff, v.assignedId)} onChange={(o) => set({ assignedId: o?.value || null })} /></div>
                    </div>
                    <AccordionCard title={tr("Email the client")} dot="#6b7280" note={tr("that the ticket was opened")} right={<Switcher checked={v.notifyClient} onChange={(c) => set({ notifyClient: c })} />} />
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button onClick={onClose}>{tr("Cancel")}</Button><Button variant="solid" loading={saving} disabled={!v.subject.trim() || (!v.message.trim() && !tf.items.length) || (!v.clientId && !v.email.trim())} onClick={save}>{tr("Create ticket")}</Button></div>
        </Dialog>
    )
}

export default NewTicketDialog
