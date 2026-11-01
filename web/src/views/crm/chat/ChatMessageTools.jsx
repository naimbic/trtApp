import { useEffect, useMemo, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import RelationSelect from '../kit/RelationSelect'
import Segment from '@/components/ui/Segment'
import { api, notify } from '../kit/api'
import { mentionDirectory } from '@/utils/mentions'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>

/** What a staff member can do with a message: turn it into a task, assign it to the team, link a client and email them. */
const ChatMessageTools = ({ target, onClose, onDone }) => {
    const [people, setPeople] = useState([])
    const [v, setV] = useState({ assigneeIds: [], dueDate: '', clientId: null, leadId: null, aboutType: 'client', email: false, subject: '' })
    const [busy, setBusy] = useState(false)
    useEffect(() => { mentionDirectory().then((d) => setPeople(d.staff || [])) }, [])
    useEffect(() => { if (target) setV({ assigneeIds: target.m.assigneeIds || [], dueDate: '', clientId: target.m.clientId || null, leadId: target.m.leadId || null, aboutType: target.m.leadId ? 'lead' : 'client', email: false, subject: '' }) }, [target])
    const opts = useMemo(() => people.map((p) => ({ value: p.id, label: p.name })), [people])
    if (!target) return null
    const { m, kind } = target
    const title = { task: tr("Make a task"), assign: tr("Assign to the team"), client: tr("Link a client and email them") }[kind]
    const go = async () => {
        setBusy(true)
        try {
            const r = await api(`/api/crm/chat/messages/${m.id}`, { method: 'POST', body: { action: kind, assigneeIds: v.assigneeIds, dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : null, clientId: v.aboutType === 'client' ? v.clientId : null, leadId: v.aboutType === 'lead' ? v.leadId : null, email: v.email, subject: v.subject } })
            notify('success', kind === 'task' ? tr("Task created") : kind === 'assign' ? tr("Assigned") : r.emailed?.length ? tr("Emailed to {to}", { to: r.emailed.join(', ') }) : tr("Client linked"))
            onDone(); onClose()
            if (kind === 'task' && r.taskId) window.open(`/crm/tasks/${r.taskId}`, '_blank', 'noopener')
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen width={560} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-2">{title}</h5>
            <p className="mb-4 line-clamp-3 rounded-xl bg-gray-50 p-2.5 text-sm text-gray-600 dark:bg-gray-700/40 dark:text-gray-300">{m.body}</p>
            <div className="space-y-3">
                {kind !== 'client' && <div><L>{tr("Team")}</L><Select size="sm" isMulti placeholder={tr("Choose the people")} options={opts} value={opts.filter((o) => v.assigneeIds.includes(o.value))} onChange={(o) => setV({ ...v, assigneeIds: (o || []).map((x) => x.value) })} /><p className="mt-1 text-xs text-gray-400">{tr("They are told on the bell.")}</p></div>}
                {kind === 'task' && <div className="grid gap-3 sm:grid-cols-2"><div><L>{tr("Due date (optional)")}</L><Input size="sm" type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} /></div><div><L>{tr("Client or lead (optional)")}</L><div className="flex items-center gap-2"><Segment size="sm" value={v.aboutType} onChange={(t) => { const x = Array.isArray(t) ? t[0] : t; if (x) setV({ ...v, aboutType: x, clientId: null, leadId: null }) }}><Segment.Item value="client">{tr("Client")}</Segment.Item><Segment.Item value="lead">{tr("Lead")}</Segment.Item></Segment><div className="min-w-0 flex-1">{v.aboutType === 'lead' ? <RelationSelect key="lead" size="sm" resource="leads" value={v.leadId} onChange={(id) => setV({ ...v, leadId: id })} /> : <RelationSelect key="client" size="sm" resource="clients" value={v.clientId} onChange={(id) => setV({ ...v, clientId: id })} />}</div></div></div></div>}
                {kind === 'client' && (
                    <>
                        <div><L>{tr("Client or lead")}</L><div className="flex items-center gap-2"><Segment size="sm" value={v.aboutType} onChange={(t) => { const x = Array.isArray(t) ? t[0] : t; if (x) setV({ ...v, aboutType: x, clientId: null, leadId: null }) }}><Segment.Item value="client">{tr("Client")}</Segment.Item><Segment.Item value="lead">{tr("Lead")}</Segment.Item></Segment><div className="min-w-0 flex-1">{v.aboutType === 'lead' ? <RelationSelect key="lead" size="sm" resource="leads" value={v.leadId} onChange={(id) => setV({ ...v, leadId: id })} /> : <RelationSelect key="client" size="sm" resource="clients" value={v.clientId} onChange={(id) => setV({ ...v, clientId: id })} />}</div></div></div>
                        <label className="flex items-center gap-3 text-sm"><Switcher checked={v.email} onChange={(c) => setV({ ...v, email: c })} />{tr("Also email it now (with the screenshots)")}</label>
                        {v.email && <div><L>{tr("Subject")}</L><Input size="sm" value={v.subject} placeholder={m.body.split('\n')[0].slice(0, 80)} onChange={(e) => setV({ ...v, subject: e.target.value })} /></div>}
                    </>
                )}
            </div>
            <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>{tr("Cancel")}</Button><Button variant="solid" loading={busy} disabled={kind === 'client' && !(v.aboutType === 'lead' ? v.leadId : v.clientId)} onClick={go}>{kind === 'task' ? tr("Create the task") : kind === 'assign' ? tr("Assign") : v.email ? tr("Link and email") : tr("Link the client")}</Button></div>
        </Dialog>
    )
}

export default ChatMessageTools
