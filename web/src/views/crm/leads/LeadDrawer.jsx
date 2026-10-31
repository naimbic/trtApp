import { useCallback, useEffect, useState } from 'react'
import RichView from '@/components/crm/RichView'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import RichEditor from '@/components/crm/RichEditor'
import { plainOf } from '@/components/crm/ShareButton'
import { CommentTools, CommentEdit } from '@/components/crm/CommentParts'
import { Link, useNavigate } from 'react-router'
import { TbTrash, TbUserCheck, TbBan, TbArrowBackUp, TbFileText, TbChevronDown, TbUsers, TbAddressBook, TbMapPin, TbTarget } from 'react-icons/tb'
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
import { People } from '../tasks/shared'
import { LeadTasks, LeadMails, LeadMeetings } from './LeadTabs'
import { useCan } from '../kit/api'
import { tr } from '@/utils/t'

const EMPTY = { name: '', doText: '', title: '', company: '', email: '', phone: '', website: '', description: '', address: '', city: '', state: '', zip: '', sourceId: null, statusId: null, assignedIds: [], followerIds: [], isPublic: false }
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">{children}</label>

/** Each section has its own colour (header tint, border and icon badge) so the groups are told apart at a glance. */
const TONES = {
    blue: { box: 'border-blue-200 dark:border-blue-500/30', head: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20', badge: 'bg-blue-500 text-white' },
    emerald: { box: 'border-emerald-200 dark:border-emerald-500/30', head: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20', badge: 'bg-emerald-500 text-white' },
    amber: { box: 'border-amber-200 dark:border-amber-500/30', head: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20', badge: 'bg-amber-500 text-white' },
    violet: { box: 'border-violet-200 dark:border-violet-500/30', head: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20', badge: 'bg-violet-500 text-white' },
}

/** One foldable group of fields of the profile: coloured icon, title, a one-line summary while closed, and the fields when open. */
const Section = ({ icon, tone = 'blue', title, summary, open, onToggle, children }) => {
    const c = TONES[tone]
    return (
        <div className={`overflow-hidden rounded-xl border ${c.box}`}>
            <button type="button" aria-expanded={open} onClick={onToggle} className={`flex w-full items-center gap-2.5 px-3 py-2 text-start transition ${c.head}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base ${c.badge}`}>{icon}</span>
                <span className="shrink-0 text-sm font-semibold heading-text">{title}</span>
                {!open && summary && <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{summary}</span>}
                <span className="flex-1" />
                <TbChevronDown className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="p-3">{children}</div>}
        </div>
    )
}
const PROPOSAL = { 1: tr("Open"), 2: tr("Declined"), 3: tr("Accepted"), 4: tr("Sent"), 5: tr("Revised"), 6: tr("Draft") }

const LeadDrawer = ({ open, id, staff, presets, stage, refreshKey, onClose, onChanged }) => {
    const nav = useNavigate()
    const can = useCan()
    const [v, setV] = useState(EMPTY)
    const [editingNote, setEditingNote] = useState(null)
    const [detail, setDetail] = useState(null)
    const [lk, setLk] = useState({ statuses: [], sources: [] })
    const [saving, setSaving] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const [withNotes, setWithNotes] = useState(true)
    const [note, setNote] = useState('')
    const [openSec, setOpenSec] = useState(['team', 'contact'])
    const toggleSec = (k) => setOpenSec((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))
    const ALL_SEC = ['team', 'contact', 'address', 'about']
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
            setV({ ...EMPTY, name: l.name || '', doText: l.doText || '', title: l.title || '', company: l.company || '', email: l.email || '', phone: l.phone || '', website: l.website || '', description: l.description || '', address: l.address || '', city: l.city || '', state: l.state || '', zip: l.zip || '', sourceId: l.sourceId, statusId: l.statusId, assignedIds: l.assignedIds || [], followerIds: d.followerIds || l.followerIds || [], isPublic: !!l.isPublic })
        } catch (e) { notify('danger', e.message); onClose() }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (!open) return; setDetail(null); setNote(''); if (id) load(); else setV({ ...EMPTY, ...(presets || {}) }) }, [open, id, load, refreshKey])

    const run = async (fn, ok, after) => { try { const r = await fn(); if (ok) notify('success', ok); onChanged(); if (after) after(r); else await load() } catch (e) { notify('danger', e.message) } }
    const save = async () => {
        setSaving(true)
        try {
            await api(edit ? `/api/crm/pipeline/leads/${id}` : '/api/crm/pipeline/leads', { method: edit ? 'PUT' : 'POST', body: v })
            notify('success', edit ? tr("Lead saved") : tr("Lead created")); onChanged(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const flag = (action, ok) => run(() => api(`/api/crm/pipeline/leads/${id}/flag`, { method: 'POST', body: { action } }), ok)
    const l = detail?.lead

    const names = (ids) => staff.filter((x) => (ids || []).includes(x.id)).map((x) => x.name)
    const sz = 'sm'
    const profile = (
        <div className="space-y-2.5">
            <div className="flex justify-end text-xs"><button type="button" className="text-primary hover:underline" onClick={() => setOpenSec(openSec.length === ALL_SEC.length ? [] : ALL_SEC)}>{openSec.length === ALL_SEC.length ? tr("Collapse all") : tr("Expand all")}</button></div>
            <Section icon={<TbUsers />} tone="blue" title={tr("Pipeline and team")} open={openSec.includes('team')} onToggle={() => toggleSec('team')} summary={[opt(lk.statuses, v.statusId)?.label, opt(lk.sources, v.sourceId)?.label, names(v.assignedIds).join(', ')].filter(Boolean).join(' · ')}>
                <div className="grid grid-cols-2 gap-3">
                    <div><L>{tr("Status")}</L><Select size={sz} isDisabled={!canEdit} options={lk.statuses.filter((s) => s.isActive !== false || s.id === v.statusId).map((s) => ({ value: s.id, label: s.name }))} value={opt(lk.statuses, v.statusId)} onChange={(o) => set({ statusId: o?.value || null })} placeholder={tr("Default status")} /></div>
                    <div><L>{tr("Source")}</L><Select size={sz} isClearable isDisabled={!canEdit} formatOptionLabel={(o) => <span className="inline-flex items-center gap-2">{o.color && <i className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} />}{o.label}</span>} options={lk.sources.filter((s) => s.isActive !== false || s.id === v.sourceId).map((s) => ({ value: s.id, label: s.name, color: s.color }))} value={opt(lk.sources, v.sourceId)} onChange={(o) => set({ sourceId: o?.value || null })} /></div>
                    <div><L>{tr("Assigned to")}</L><Select size={sz} isMulti isDisabled={!canEdit} options={staff.map((s) => ({ value: s.id, label: s.name }))} value={staff.filter((s) => (v.assignedIds || []).includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} onChange={(o) => set({ assignedIds: (o || []).map((x) => x.value) })} placeholder={tr("Me")} /></div>
                    <div><L>{tr("Followers")}</L><Select size={sz} isMulti isDisabled={!canEdit} options={staff.map((s) => ({ value: s.id, label: s.name }))} value={staff.filter((s) => (v.followerIds || []).includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} onChange={(o) => set({ followerIds: (o || []).map((x) => x.value) })} placeholder={tr("Who should follow this lead")} /></div>
                    <div className="col-span-2"><L>{tr("DO:")}</L><Input size={sz} prefix={<TbTarget />} disabled={!canEdit} value={v.doText} maxLength={160} placeholder={tr("The next thing to do, shown on the card")} onChange={(e) => set({ doText: e.target.value })} /></div>
                    <div className="col-span-2 flex items-center justify-between text-sm"><span>{tr("Visible to the whole team")}</span><Switcher disabled={!canEdit} checked={v.isPublic} onChange={(c) => set({ isPublic: c })} /></div>
                </div>
            </Section>
            <Section icon={<TbAddressBook />} tone="emerald" title={tr("Contact")} open={openSec.includes('contact')} onToggle={() => toggleSec('contact')} summary={[v.name, v.company, v.email, v.phone].filter(Boolean).join(' · ')}>
                <div className="grid grid-cols-2 gap-3">
                    <div><L>{tr("Name")}</L><Input size={sz} disabled={!canEdit} value={v.name} onChange={(e) => set({ name: e.target.value })} /></div>
                    <div><L>{tr("Company")}</L><Input size={sz} disabled={!canEdit} value={v.company} onChange={(e) => set({ company: e.target.value })} /></div>
                    <div><L>{tr("Email")}</L><Input size={sz} disabled={!canEdit} value={v.email} onChange={(e) => set({ email: e.target.value })} /></div>
                    <div><L>{tr("Phone")}</L><Input size={sz} disabled={!canEdit} value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
                    <div><L>{tr("Position")}</L><Input size={sz} disabled={!canEdit} value={v.title} onChange={(e) => set({ title: e.target.value })} /></div>
                    <div><L>{tr("Website")}</L><Input size={sz} disabled={!canEdit} value={v.website} onChange={(e) => set({ website: e.target.value })} /></div>
                </div>
            </Section>
            <Section icon={<TbMapPin />} tone="amber" title={tr("Address")} open={openSec.includes('address')} onToggle={() => toggleSec('address')} summary={[v.address, v.city, v.state, v.zip].filter(Boolean).join(', ')}>
                <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-6"><L>{tr("Address")}</L><Input size={sz} disabled={!canEdit} value={v.address} onChange={(e) => set({ address: e.target.value })} /></div>
                    <div className="col-span-3"><L>{tr("City")}</L><Input size={sz} disabled={!canEdit} value={v.city} onChange={(e) => set({ city: e.target.value })} /></div>
                    <div className="col-span-2"><L>{tr("State")}</L><Input size={sz} disabled={!canEdit} value={v.state} onChange={(e) => set({ state: e.target.value })} /></div>
                    <div className="col-span-1"><L>{tr("ZIP")}</L><Input size={sz} disabled={!canEdit} value={v.zip} onChange={(e) => set({ zip: e.target.value })} /></div>
                </div>
            </Section>
            <Section icon={<TbFileText />} tone="violet" title={tr("Description")} open={openSec.includes('about')} onToggle={() => toggleSec('about')} summary={plainOf(v.description || '').replace(/\s+/g, ' ').slice(0, 140)}>
                <RichEditor minHeight={110} disabled={!canEdit} value={v.description} onChange={(html) => set({ description: html })} />
            </Section>
        </div>
    )

    const notes = detail && (
        <div className="space-y-4">
            <div className="space-y-2"><RichEditor minHeight={90} placeholder={tr("Log a call, a meeting or a thought")} value={note} onChange={setNote} /><Button size="sm" variant="solid" disabled={!note.trim()} onClick={() => run(() => api(`/api/crm/pipeline/leads/${id}/notes`, { method: 'POST', body: { content: note } }).then(() => setNote('')), tr("Note added"))}>{tr("Add note")}</Button></div>
            {detail.notes.map((n) => (
                <div key={n.id} className="group relative rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{n.by?.name || tr("Unknown")}</span><span>{dayjs(n.date).format('DD MMM YYYY, HH:mm')}{n.edited ? ` · ${tr('edited')}` : ''}</span></div>
                    {editingNote === n.id
                        ? <CommentEdit initial={n.content} onCancel={() => setEditingNote(null)} onSave={async (text) => { await api(`/api/crm/pipeline/leads/${id}/notes`, { method: 'PUT', body: { noteId: n.id, content: text } }); setEditingNote(null); await load() }} />
                        : <RichView html={n.content} />}
                    {editingNote !== n.id && <CommentTools share={{ url: `/crm/leads/${id}`, title: l?.name, text: `${n.by?.name ? `${n.by.name}: ` : ''}${plainOf(n.content)}` }} onReply={() => setNote((x) => x || (n.by?.name ? `@${n.by.name} ` : ''))} onEdit={n.canEdit ? () => setEditingNote(n.id) : null} onDelete={n.canDelete ? () => run(() => api(`/api/crm/pipeline/leads/${id}/notes?noteId=${n.id}`, { method: 'DELETE' })) : null} />}
                </div>
            ))}
            {!detail.notes.length && <p className="text-sm text-gray-500">{tr("No notes yet.")}</p>}
        </div>
    )

    const related = detail && (
        <div className="space-y-6">
            <div>
                <div className="mb-2 flex items-center justify-between"><h6>{tr("Proposals")}</h6><Button size="xs" icon={<TbFileText />} data-href={`/crm/proposals/new?leadId=${id}`} onClick={() => nav(`/crm/proposals/new?leadId=${id}`)}>{tr("New proposal")}</Button></div>
                {detail.proposals.map((p) => <Link key={p.id} to={`/crm/proposals/${p.id}`} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm hover:text-primary dark:border-gray-700"><span>{p.subject || tr("Proposal {number}", { number: p.number })}</span><Tag>{PROPOSAL[p.status] || p.status}</Tag></Link>)}
                {!detail.proposals.length && <p className="text-sm text-gray-500">{tr("No proposals yet.")}</p>}
            </div>
        </div>
    )

    const activity = detail && (
        <div className="space-y-3">
            {detail.activity.map((a) => <div key={a.id} className="text-sm"><div>{a.text}</div><div className="text-xs text-gray-500">{a.by ? `${a.by} · ` : ''}{dayjs(a.date).format('DD MMM YYYY, HH:mm')}</div></div>)}
            {!detail.activity.length && <p className="text-sm text-gray-500">{tr("Nothing logged yet.")}</p>}
        </div>
    )

    const headActions = l && (
        <>
            {detail.can.convert && <button type="button" className="rp-qv-act is-solid" onClick={() => setConfirm('convert')}><TbUserCheck />{tr("Convert to client")}</button>}
            {!l.lost && !l.junk && <button type="button" className="rp-qv-act" onClick={() => flag('lost', tr("Marked as lost"))}><TbBan />{tr("Lost")}</button>}
            {!l.lost && !l.junk && <button type="button" className="rp-qv-act" onClick={() => flag('junk', tr("Marked as junk"))}><TbBan />{tr("Junk")}</button>}
            {(l.lost || l.junk) && <button type="button" className="rp-qv-act" onClick={() => flag('restore', tr("Lead restored"))}><TbArrowBackUp />{tr("Restore")}</button>}
        </>
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
            share={edit ? { url: `/crm/leads/${id}`, title: l?.name, text: l?.name } : undefined}
            title={edit ? l?.name || tr("Lead") : tr("New lead")} kicker={edit ? `${tr("Lead")}${l?.company ? ` · ${l.company}` : ''}` : tr("New lead")} sub={l?.company} date={l?.lastContact ? `${tr("Last contact")} ${dayjs(l.lastContact).format('DD MMM')}` : ''} team={l?.assignees?.length ? <People list={l.assignees} max={5} size={30} /> : null} actions={edit && detail?.can.edit && l ? headActions : null} stage={stage} isOpen={open} onClose={onClose} width={640}
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
                    <Tabs defaultValue="profile">
                        <Tabs.TabList>
                            <Tabs.TabNav value="profile">{tr("Profile")}</Tabs.TabNav>
                            {can('tasks', 'view') && <Tabs.TabNav value="tasks">{tr("Tasks")}</Tabs.TabNav>}
                            <Tabs.TabNav value="mails">{tr("Mails")}{detail.mails.length ? ` (${detail.mails.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="meetings">{tr("Meetings")}{detail.meetings.length ? ` (${detail.meetings.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="files">{tr("Files")}</Tabs.TabNav>
                            <Tabs.TabNav value="notes">{tr("Notes")}{detail.notes.length ? ` (${detail.notes.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="related">{tr("Related")}{detail.proposals.length ? ` (${detail.proposals.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="activity">{tr("Activity")}</Tabs.TabNav>
                        </Tabs.TabList>
                        <div className="pt-4">
                            <Tabs.TabContent value="profile">{profile}</Tabs.TabContent>
                            {can('tasks', 'view') && <Tabs.TabContent value="tasks"><LeadTasks leadId={id} staff={staff} onChanged={onChanged} /></Tabs.TabContent>}
                            <Tabs.TabContent value="mails"><LeadMails leadId={id} mails={detail.mails} senders={detail.senders || []} leadEmail={detail.lead?.email || ''} canEdit={!!detail.can.edit} run={run} /></Tabs.TabContent>
                            <Tabs.TabContent value="meetings"><LeadMeetings leadId={id} leadName={l.name} meetings={detail.meetings} staff={staff} canEdit={!!detail.can.edit} run={run} /></Tabs.TabContent>
                            <Tabs.TabContent value="files"><div className="pt-1"><AttachmentsPanel relType="lead" relId={id} canEdit={!!detail.can.edit} /></div></Tabs.TabContent>
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
