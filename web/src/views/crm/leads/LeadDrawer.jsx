import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { TbTrash, TbUserCheck, TbBan, TbArrowBackUp, TbFileText } from 'react-icons/tb'
import dayjs from 'dayjs'
import Drawer from '@/components/crm/PopupFrame'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { STATUS as TASK_STATUS } from '../tasks/shared'
import { People } from '../tasks/shared'
import { tr } from '@/utils/t'

const EMPTY = { name: '', doText: '', title: '', company: '', email: '', phone: '', website: '', description: '', address: '', city: '', state: '', zip: '', sourceId: null, statusId: null, assignedIds: [], isPublic: false }
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const PROPOSAL = { 1: tr("Open"), 2: tr("Declined"), 3: tr("Accepted"), 4: tr("Sent"), 5: tr("Revised"), 6: tr("Draft") }

const LeadDrawer = ({ open, id, staff, presets, stage, refreshKey, onClose, onChanged }) => {
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
    const opt = (list, val) => { const x = list.find((o) => o.id === val); return x ? { value: x.id, label: x.name, color: x.color } : null }

    useEffect(() => { if (open && !lk.statuses.length) api('/api/crm/pipeline/leads/lookups').then(setLk).catch(() => {}) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    const load = useCallback(async () => {
        if (!id) return
        try {
            const d = await api(`/api/crm/pipeline/leads/${id}`)
            setDetail(d)
            const l = d.lead
            setV({ ...EMPTY, name: l.name || '', doText: l.doText || '', title: l.title || '', company: l.company || '', email: l.email || '', phone: l.phone || '', website: l.website || '', description: l.description || '', address: l.address || '', city: l.city || '', state: l.state || '', zip: l.zip || '', sourceId: l.sourceId, statusId: l.statusId, assignedIds: l.assignedIds || [], isPublic: !!l.isPublic })
        } catch (e) { notify('danger', e.message); onClose() }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (!open) return; setDetail(null); setNote(''); if (id) load(); else setV({ ...EMPTY, ...(presets || {}) }) }, [open, id, load, refreshKey])

    const run = async (fn, ok, after) => { try { const r = await fn(); if (ok) notify('success', ok); onChanged(); if (after) after(r); else await load() } catch (e) { notify('danger', e.message) } }
    const save = async () => {
        setSaving(true)
        try {
            await api(edit ? `/api/crm/pipeline/leads/${id}` : '/api/crm/pipeline/leads', { method: edit ? 'PUT' : 'POST', body: v })
            notify('success', edit ? tr("Lead saved") : tr("Lead created")); onChanged(); if (edit) await load(); else onClose()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const flag = (action, ok) => run(() => api(`/api/crm/pipeline/leads/${id}/flag`, { method: 'POST', body: { action } }), ok)
    const l = detail?.lead

    const profile = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><L>{tr("Status")}</L><Select isDisabled={!canEdit} options={lk.statuses.filter((s) => s.isActive !== false || s.id === v.statusId).map((s) => ({ value: s.id, label: s.name }))} value={opt(lk.statuses, v.statusId)} onChange={(o) => set({ statusId: o?.value || null })} placeholder={tr("Default status")} /></div>
                <div><L>{tr("Source")}</L><Select isClearable isDisabled={!canEdit} formatOptionLabel={(o) => <span className="inline-flex items-center gap-2">{o.color && <i className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} />}{o.label}</span>} options={lk.sources.filter((s) => s.isActive !== false || s.id === v.sourceId).map((s) => ({ value: s.id, label: s.name, color: s.color }))} value={opt(lk.sources, v.sourceId)} onChange={(o) => set({ sourceId: o?.value || null })} /></div>
            </div>
            <div><L>{tr("Assigned to")}</L><Select isMulti isDisabled={!canEdit} options={staff.map((s) => ({ value: s.id, label: s.name }))} value={staff.filter((s) => (v.assignedIds || []).includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} onChange={(o) => set({ assignedIds: (o || []).map((x) => x.value) })} placeholder={tr("Me")} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><L>{tr("Name")}</L><Input disabled={!canEdit} value={v.name} onChange={(e) => set({ name: e.target.value })} /></div>
                <div className="col-span-2"><L>{tr("DO:")}</L><Input disabled={!canEdit} value={v.doText} maxLength={160} placeholder={tr("The next thing to do, shown on the card")} onChange={(e) => set({ doText: e.target.value })} /></div>
                <div><L>{tr("Position")}</L><Input disabled={!canEdit} value={v.title} onChange={(e) => set({ title: e.target.value })} /></div>
                <div><L>{tr("Email")}</L><Input disabled={!canEdit} value={v.email} onChange={(e) => set({ email: e.target.value })} /></div>
                <div><L>{tr("Phone")}</L><Input disabled={!canEdit} value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
                <div><L>{tr("Company")}</L><Input disabled={!canEdit} value={v.company} onChange={(e) => set({ company: e.target.value })} /></div>
                <div><L>{tr("Website")}</L><Input disabled={!canEdit} value={v.website} onChange={(e) => set({ website: e.target.value })} /></div>
            </div>
            <div><L>{tr("Address")}</L><Input disabled={!canEdit} value={v.address} onChange={(e) => set({ address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
                <div><L>{tr("City")}</L><Input disabled={!canEdit} value={v.city} onChange={(e) => set({ city: e.target.value })} /></div>
                <div><L>{tr("State")}</L><Input disabled={!canEdit} value={v.state} onChange={(e) => set({ state: e.target.value })} /></div>
                <div><L>{tr("ZIP")}</L><Input disabled={!canEdit} value={v.zip} onChange={(e) => set({ zip: e.target.value })} /></div>
            </div>
            <div><L>{tr("Description")}</L><Input textArea rows={4} disabled={!canEdit} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
            <div className="flex items-center justify-between text-sm"><span>{tr("Visible to the whole team")}</span><Switcher disabled={!canEdit} checked={v.isPublic} onChange={(c) => set({ isPublic: c })} /></div>
        </div>
    )

    const notes = detail && (
        <div className="space-y-4">
            <div className="space-y-2"><Input textArea rows={3} placeholder={tr("Log a call, a meeting or a thought")} value={note} onChange={(e) => setNote(e.target.value)} /><Button size="sm" variant="solid" disabled={!note.trim()} onClick={() => run(() => api(`/api/crm/pipeline/leads/${id}/notes`, { method: 'POST', body: { content: note } }).then(() => setNote('')), tr("Note added"))}>{tr("Add note")}</Button></div>
            {detail.notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{n.by?.name || tr("Unknown")}</span><span>{dayjs(n.date).format('DD MMM YYYY, HH:mm')}{(n.mine || detail.can.delete) && <button className="ml-2 text-red-500" onClick={() => run(() => api(`/api/crm/pipeline/leads/${id}/notes?noteId=${n.id}`, { method: 'DELETE' }))}>{tr("delete")}</button>}</span></div>
                    <div className="whitespace-pre-line">{n.content}</div>
                </div>
            ))}
            {!detail.notes.length && <p className="text-sm text-gray-500">{tr("No notes yet.")}</p>}
        </div>
    )

    const related = detail && (
        <div className="space-y-6">
            <div>
                <div className="mb-2 flex items-center justify-between"><h6>{tr("Proposals")}</h6><Button size="xs" icon={<TbFileText />} onClick={() => nav(`/crm/proposals/new?leadId=${id}`)}>{tr("New proposal")}</Button></div>
                {detail.proposals.map((p) => <Link key={p.id} to={`/crm/proposals/${p.id}`} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm hover:text-primary dark:border-gray-700"><span>{p.subject || tr("Proposal {number}", { number: p.number })}</span><Tag>{PROPOSAL[p.status] || p.status}</Tag></Link>)}
                {!detail.proposals.length && <p className="text-sm text-gray-500">{tr("No proposals yet.")}</p>}
            </div>
            <div>
                <h6 className="mb-2">{tr("Tasks")}</h6>
                {detail.tasks.map((t) => <Link key={t.id} to={`/crm/tasks-board?task=${t.id}`} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm hover:text-primary dark:border-gray-700"><span>{t.name}</span><span className="text-xs text-gray-500">{TASK_STATUS.find((s) => s.value === t.status)?.label}</span></Link>)}
                {!detail.tasks.length && <p className="text-sm text-gray-500">{tr("No tasks linked to this lead.")}</p>}
            </div>
        </div>
    )

    const activity = detail && (
        <div className="space-y-3">
            {detail.activity.map((a) => <div key={a.id} className="text-sm"><div>{a.text}</div><div className="text-xs text-gray-500">{a.by ? `${a.by} · ` : ''}{dayjs(a.date).format('DD MMM YYYY, HH:mm')}</div></div>)}
            {!detail.activity.length && <p className="text-sm text-gray-500">{tr("Nothing logged yet.")}</p>}
        </div>
    )

    const headerBadges = l && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            {l.status && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: l.statusColor || '#94a3b8' }} />{l.status}</span>}
            {l.lost && <Tag className="bg-red-100 text-red-600">{tr("Lost")}</Tag>}{l.junk && <Tag className="bg-amber-100 text-amber-700">{tr("Junk")}</Tag>}
            {l.client && <Link className="text-primary hover:underline" to={`/crm/clients/${l.client.id}`}>{tr("→ client")} {l.client.company}</Link>}
        </div>
    )

    return (
        <Drawer
            title={edit ? l?.name || tr("Lead") : tr("New lead")} kicker={edit ? `${tr("Lead")}${l?.company ? ` · ${l.company}` : ''}` : tr("New lead")} sub={l?.company} date={l?.lastContact ? `${tr("Last contact")} ${dayjs(l.lastContact).format('DD MMM')}` : ''} team={l?.assignees?.length ? <People list={l.assignees} max={5} size={30} /> : null} stage={stage} isOpen={open} onClose={onClose} width={640}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && !l?.converted && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm('delete')}>{tr("Delete")}</Button>}
                    <div className="ml-auto flex gap-2"><Button onClick={onClose}>{canEdit ? tr("Cancel") : tr("Close")}</Button>{canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? tr("Save changes") : tr("Create lead")}</Button>}</div>
                </div>
            }
        >
            {edit && !detail ? <div className="py-10 text-center text-gray-500">{tr("Loading…")}</div> : edit ? (
                <>
                    {headerBadges}
                    {detail.can.edit && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            {detail.can.convert && <Button size="sm" variant="solid" icon={<TbUserCheck />} onClick={() => setConfirm('convert')}>{tr("Convert to client")}</Button>}
                            {!l.lost && !l.junk && <Button size="sm" icon={<TbBan />} onClick={() => flag('lost', tr("Marked as lost"))}>{tr("Lost")}</Button>}
                            {!l.lost && !l.junk && <Button size="sm" icon={<TbBan />} onClick={() => flag('junk', tr("Marked as junk"))}>{tr("Junk")}</Button>}
                            {(l.lost || l.junk) && <Button size="sm" icon={<TbArrowBackUp />} onClick={() => flag('restore', tr("Lead restored"))}>{tr("Restore")}</Button>}
                        </div>
                    )}
                    <Tabs defaultValue="profile">
                        <Tabs.TabList>
                            <Tabs.TabNav value="profile">{tr("Profile")}</Tabs.TabNav>
                            <Tabs.TabNav value="notes">{tr("Notes")}{detail.notes.length ? ` (${detail.notes.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="related">{tr("Related")}{detail.proposals.length + detail.tasks.length ? ` (${detail.proposals.length + detail.tasks.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="activity">{tr("Activity")}</Tabs.TabNav>
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
            <ConfirmDialog isOpen={confirm === 'delete'} type="danger" title={tr("Delete this lead?")} confirmText={tr("Delete")} onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); run(() => api(`/api/crm/pipeline/leads/${id}`, { method: 'DELETE' }), tr("Lead deleted"), onClose) }}>
                <p>{tr("The lead, its notes and its activity are removed for good.")}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={confirm === 'convert'} type="info" title={tr("Convert to a client?")} confirmText={tr("Convert")} onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); run(() => api(`/api/crm/pipeline/leads/${id}/convert`, { method: 'POST', body: { includeNotes: withNotes } }), tr("Client created"), (r) => { onClose(); nav(`/crm/clients/${r.clientId}`) }) }}>
                <p>{tr("A client and its first contact are created from this lead.")}</p>
                <label className="mt-3 flex items-center gap-2 text-sm"><Switcher checked={withNotes} onChange={setWithNotes} />{tr("Copy the lead notes to the client")}</label>
            </ConfirmDialog>
        </Drawer>
    )
}

export default LeadDrawer
