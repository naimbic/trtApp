import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { TbTrash, TbUserCheck, TbBan, TbArrowBackUp, TbFileText } from 'react-icons/tb'
import dayjs from 'dayjs'
import Drawer from '@/components/ui/Drawer'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { STATUS as TASK_STATUS } from '../tasks/shared'

const EMPTY = { name: '', title: '', company: '', email: '', phone: '', website: '', description: '', address: '', city: '', state: '', zip: '', sourceId: null, statusId: null, assignedId: null, isPublic: false }
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const PROPOSAL = { 1: 'Open', 2: 'Declined', 3: 'Accepted', 4: 'Sent', 5: 'Revised', 6: 'Draft' }

const LeadDrawer = ({ open, id, staff, onClose, onChanged }) => {
    const nav = useNavigate()
    const [v, setV] = useState(EMPTY)
    const [detail, setDetail] = useState(null)
    const [lk, setLk] = useState({ statuses: [], sources: [] })
    const [saving, setSaving] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const [withNotes, setWithNotes] = useState(true)
    const [note, setNote] = useState('')
    const edit = !!id
    const canEdit = edit ? detail?.can.edit : true
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const opt = (list, val) => { const x = list.find((o) => o.id === val); return x ? { value: x.id, label: x.name } : null }

    useEffect(() => { if (open && !lk.statuses.length) api('/api/crm/pipeline/leads/lookups').then(setLk).catch(() => {}) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    const load = useCallback(async () => {
        if (!id) return
        try {
            const d = await api(`/api/crm/pipeline/leads/${id}`)
            setDetail(d)
            const l = d.lead
            setV({ ...EMPTY, name: l.name || '', title: l.title || '', company: l.company || '', email: l.email || '', phone: l.phone || '', website: l.website || '', description: l.description || '', address: l.address || '', city: l.city || '', state: l.state || '', zip: l.zip || '', sourceId: l.sourceId, statusId: l.statusId, assignedId: l.assignedId, isPublic: !!l.isPublic })
        } catch (e) { notify('danger', e.message); onClose() }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (!open) return; setDetail(null); setNote(''); if (id) load(); else setV(EMPTY) }, [open, id, load])

    const run = async (fn, ok, after) => { try { const r = await fn(); if (ok) notify('success', ok); onChanged(); if (after) after(r); else await load() } catch (e) { notify('danger', e.message) } }
    const save = async () => {
        setSaving(true)
        try {
            await api(edit ? `/api/crm/pipeline/leads/${id}` : '/api/crm/pipeline/leads', { method: edit ? 'PUT' : 'POST', body: v })
            notify('success', edit ? 'Lead saved' : 'Lead created'); onChanged(); if (edit) await load(); else onClose()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const flag = (action, ok) => run(() => api(`/api/crm/pipeline/leads/${id}/flag`, { method: 'POST', body: { action } }), ok)
    const l = detail?.lead

    const profile = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><L>Status</L><Select isDisabled={!canEdit} options={lk.statuses.map((s) => ({ value: s.id, label: s.name }))} value={opt(lk.statuses, v.statusId)} onChange={(o) => set({ statusId: o?.value || null })} placeholder="Default status" /></div>
                <div><L>Source</L><Select isClearable isDisabled={!canEdit} options={lk.sources.map((s) => ({ value: s.id, label: s.name }))} value={opt(lk.sources, v.sourceId)} onChange={(o) => set({ sourceId: o?.value || null })} /></div>
            </div>
            <div><L>Assigned to</L><Select isClearable isDisabled={!canEdit} options={staff.map((s) => ({ value: s.id, label: s.name }))} value={opt(staff, v.assignedId)} onChange={(o) => set({ assignedId: o?.value || null })} placeholder="Me" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><L>Name</L><Input disabled={!canEdit} value={v.name} onChange={(e) => set({ name: e.target.value })} /></div>
                <div><L>Position</L><Input disabled={!canEdit} value={v.title} onChange={(e) => set({ title: e.target.value })} /></div>
                <div><L>Email</L><Input disabled={!canEdit} value={v.email} onChange={(e) => set({ email: e.target.value })} /></div>
                <div><L>Phone</L><Input disabled={!canEdit} value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
                <div><L>Company</L><Input disabled={!canEdit} value={v.company} onChange={(e) => set({ company: e.target.value })} /></div>
                <div><L>Website</L><Input disabled={!canEdit} value={v.website} onChange={(e) => set({ website: e.target.value })} /></div>
            </div>
            <div><L>Address</L><Input disabled={!canEdit} value={v.address} onChange={(e) => set({ address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
                <div><L>City</L><Input disabled={!canEdit} value={v.city} onChange={(e) => set({ city: e.target.value })} /></div>
                <div><L>State</L><Input disabled={!canEdit} value={v.state} onChange={(e) => set({ state: e.target.value })} /></div>
                <div><L>ZIP</L><Input disabled={!canEdit} value={v.zip} onChange={(e) => set({ zip: e.target.value })} /></div>
            </div>
            <div><L>Description</L><Input textArea rows={4} disabled={!canEdit} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
            <div className="flex items-center justify-between text-sm"><span>Visible to the whole team</span><Switcher disabled={!canEdit} checked={v.isPublic} onChange={(c) => set({ isPublic: c })} /></div>
        </div>
    )

    const notes = detail && (
        <div className="space-y-4">
            <div className="space-y-2"><Input textArea rows={3} placeholder="Log a call, a meeting or a thought" value={note} onChange={(e) => setNote(e.target.value)} /><Button size="sm" variant="solid" disabled={!note.trim()} onClick={() => run(() => api(`/api/crm/pipeline/leads/${id}/notes`, { method: 'POST', body: { content: note } }).then(() => setNote('')), 'Note added')}>Add note</Button></div>
            {detail.notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{n.by?.name || 'Unknown'}</span><span>{dayjs(n.date).format('DD MMM YYYY, HH:mm')}{(n.mine || detail.can.delete) && <button className="ml-2 text-red-500" onClick={() => run(() => api(`/api/crm/pipeline/leads/${id}/notes?noteId=${n.id}`, { method: 'DELETE' }))}>delete</button>}</span></div>
                    <div className="whitespace-pre-line">{n.content}</div>
                </div>
            ))}
            {!detail.notes.length && <p className="text-sm text-gray-500">No notes yet.</p>}
        </div>
    )

    const related = detail && (
        <div className="space-y-6">
            <div>
                <div className="mb-2 flex items-center justify-between"><h6>Proposals</h6><Button size="xs" icon={<TbFileText />} onClick={() => nav(`/crm/proposals/new?leadId=${id}`)}>New proposal</Button></div>
                {detail.proposals.map((p) => <Link key={p.id} to={`/crm/proposals/${p.id}`} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm hover:text-primary dark:border-gray-700"><span>{p.subject || `Proposal ${p.number}`}</span><Tag>{PROPOSAL[p.status] || p.status}</Tag></Link>)}
                {!detail.proposals.length && <p className="text-sm text-gray-500">No proposals yet.</p>}
            </div>
            <div>
                <h6 className="mb-2">Tasks</h6>
                {detail.tasks.map((t) => <Link key={t.id} to={`/crm/tasks-board?task=${t.id}`} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm hover:text-primary dark:border-gray-700"><span>{t.name}</span><span className="text-xs text-gray-500">{TASK_STATUS.find((s) => s.value === t.status)?.label}</span></Link>)}
                {!detail.tasks.length && <p className="text-sm text-gray-500">No tasks linked to this lead.</p>}
            </div>
        </div>
    )

    const activity = detail && (
        <div className="space-y-3">
            {detail.activity.map((a) => <div key={a.id} className="text-sm"><div>{a.text}</div><div className="text-xs text-gray-500">{a.by ? `${a.by} · ` : ''}{dayjs(a.date).format('DD MMM YYYY, HH:mm')}</div></div>)}
            {!detail.activity.length && <p className="text-sm text-gray-500">Nothing logged yet.</p>}
        </div>
    )

    const headerBadges = l && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            {l.status && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: l.statusColor || '#94a3b8' }} />{l.status}</span>}
            {l.lost && <Tag className="bg-red-100 text-red-600">Lost</Tag>}{l.junk && <Tag className="bg-amber-100 text-amber-700">Junk</Tag>}
            {l.client && <Link className="text-primary hover:underline" to={`/crm/clients/${l.client.id}`}>→ client {l.client.company}</Link>}
        </div>
    )

    return (
        <Drawer
            title={edit ? l?.name || 'Lead' : 'New lead'} isOpen={open} onClose={onClose} onRequestClose={onClose} width={600}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && !l?.converted && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm('delete')}>Delete</Button>}
                    <div className="ml-auto flex gap-2"><Button onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>{canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? 'Save changes' : 'Create lead'}</Button>}</div>
                </div>
            }
        >
            {edit && !detail ? <div className="py-10 text-center text-gray-500">Loading…</div> : edit ? (
                <>
                    {headerBadges}
                    {detail.can.edit && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            {detail.can.convert && <Button size="sm" variant="solid" icon={<TbUserCheck />} onClick={() => setConfirm('convert')}>Convert to client</Button>}
                            {!l.lost && !l.junk && <Button size="sm" icon={<TbBan />} onClick={() => flag('lost', 'Marked as lost')}>Lost</Button>}
                            {!l.lost && !l.junk && <Button size="sm" icon={<TbBan />} onClick={() => flag('junk', 'Marked as junk')}>Junk</Button>}
                            {(l.lost || l.junk) && <Button size="sm" icon={<TbArrowBackUp />} onClick={() => flag('restore', 'Lead restored')}>Restore</Button>}
                        </div>
                    )}
                    <Tabs defaultValue="profile">
                        <Tabs.TabList>
                            <Tabs.TabNav value="profile">Profile</Tabs.TabNav>
                            <Tabs.TabNav value="notes">Notes{detail.notes.length ? ` (${detail.notes.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="related">Related{detail.proposals.length + detail.tasks.length ? ` (${detail.proposals.length + detail.tasks.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="activity">Activity</Tabs.TabNav>
                        </Tabs.TabList>
                        <div className="pt-4">
                            <Tabs.TabContent value="profile">{profile}</Tabs.TabContent>
                            <Tabs.TabContent value="notes">{notes}</Tabs.TabContent>
                            <Tabs.TabContent value="related">{related}</Tabs.TabContent>
                            <Tabs.TabContent value="activity">{activity}</Tabs.TabContent>
                        </div>
                    </Tabs>
                </>
            ) : profile}
            <ConfirmDialog isOpen={confirm === 'delete'} type="danger" title="Delete this lead?" confirmText="Delete" onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); run(() => api(`/api/crm/pipeline/leads/${id}`, { method: 'DELETE' }), 'Lead deleted', onClose) }}>
                <p>The lead, its notes and its activity are removed for good.</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={confirm === 'convert'} type="info" title="Convert to a client?" confirmText="Convert" onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); run(() => api(`/api/crm/pipeline/leads/${id}/convert`, { method: 'POST', body: { includeNotes: withNotes } }), 'Client created', (r) => { onClose(); nav(`/crm/clients/${r.clientId}`) }) }}>
                <p>A client and its first contact are created from this lead.</p>
                <label className="mt-3 flex items-center gap-2 text-sm"><Switcher checked={withNotes} onChange={setWithNotes} />Copy the lead notes to the client</label>
            </ConfirmDialog>
        </Drawer>
    )
}

export default LeadDrawer
