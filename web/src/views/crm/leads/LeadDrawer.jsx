import { useCallback, useEffect, useRef, useState } from 'react'
import RemindMe from '@/components/crm/RemindMe'
import RichView from '@/components/crm/RichView'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import RichEditor from '@/components/crm/RichEditor'
import { plainOf } from '@/components/crm/ShareButton'
import { CommentFoot, CommentThread, startReply, CommentEdit, ReplyingTo } from '@/components/crm/CommentParts'
import StaffRing from '@/components/crm/StaffRing'
import Avatar from '@/components/ui/Avatar'
import { initials } from '../tasks/shared'
import { Link, useNavigate } from 'react-router'
import { TbTrash, TbUserCheck, TbBan, TbArrowBackUp, TbFileText, TbUsers, TbAddressBook, TbMapPin, TbTarget, TbFileInvoice, TbReceipt } from 'react-icons/tb'
import dayjs from 'dayjs'
import Drawer from '@/components/crm/PopupFrame'
import DuplicateWarning from '@/components/crm/DuplicateWarning'
import FoldSection from '@/components/crm/FoldSection'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import WebsiteField from '@/components/crm/SiteInfo'
import Switcher from '@/components/ui/Switcher'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { People } from '../tasks/shared'
import { LeadTasks, LeadMails, LeadMeetings } from './LeadTabs'
import ActivityFeed from '@/components/crm/ActivityFeed'
import { useCan } from '../kit/api'
import { tr } from '@/utils/t'
import useTabParam from '@/utils/useTabParam'

const LEAD_LANGUAGES = [['english', 'English'], ['french', 'Français'], ['arabic', 'العربية'], ['spanish', 'Español'], ['german', 'Deutsch'], ['italian', 'Italiano'], ['portuguese', 'Português'], ['dutch', 'Nederlands'], ['turkish', 'Türkçe'], ['russian', 'Русский'], ['japanese', '日本語']].map(([value, label]) => ({ value, label }))
const EMPTY = { name: '', doText: '', title: '', company: '', email: '', phone: '', website: '', description: '', address: '', city: '', state: '', zip: '', country: null, sourceId: null, statusId: null, assignedIds: [], followerIds: [], isPublic: false, defaultLanguage: '', value: '', probability: '', expectedClose: '' }
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">{children}</label>

const PROPOSAL = { 1: tr("Open"), 2: tr("Declined"), 3: tr("Accepted"), 4: tr("Sent"), 5: tr("Revised"), 6: tr("Draft") }

const LeadDrawer = ({ open, id, staff, presets, stage, refreshKey, onClose, onChanged }) => {
    const nav = useNavigate()
    const can = useCan()
    const [v, setV] = useState(EMPTY)
    const [tabV, setTabV] = useTabParam(['profile', 'tasks', 'mails', 'meetings', 'files', 'notes', 'related', 'activity'], 'profile')
    const [editingNote, setEditingNote] = useState(null)
    const [replyTo, setReplyTo] = useState(null)
    const editorRef = useRef(null)
    const [detail, setDetail] = useState(null)
    // the tabs this person may see (Roles > Lead popup tabs); a tab that is off is not shown, and the popup opens on the first one that is on
    const tabOk = { profile: true, mails: true, meetings: true, offers: true, activity: true, ...(detail?.can?.tabs || {}) }
    const TAB_OF = { profile: 'profile', mails: 'mails', meetings: 'meetings', related: 'offers', activity: 'activity' }
    useEffect(() => { if (detail && TAB_OF[tabV] && !tabOk[TAB_OF[tabV]]) setTabV(tabOk.profile ? 'profile' : can('tasks', 'view') ? 'tasks' : 'notes') }, [detail, tabV]) // eslint-disable-line react-hooks/exhaustive-deps
    const [lk, setLk] = useState({ statuses: [], sources: [], countries: [] })
    const [saving, setSaving] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const [withNotes, setWithNotes] = useState(true)
    const [docFor, setDocFor] = useState(null) // 'estimates' | 'invoices': asked from a lead that is not a client yet
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
            setV({ ...EMPTY, name: l.name || '', doText: l.doText || '', title: l.title || '', company: l.company || '', email: l.email || '', phone: l.phone || '', website: l.website || '', description: l.description || '', address: l.address || '', city: l.city || '', state: l.state || '', zip: l.zip || '', country: l.country ?? null, sourceId: l.sourceId, statusId: l.statusId, assignedIds: l.assignedIds || [], followerIds: d.followerIds || l.followerIds || [], isPublic: !!l.isPublic, defaultLanguage: l.defaultLanguage || '', value: l.value ?? '', probability: l.probability ?? '', expectedClose: l.expectedClose ? String(l.expectedClose).slice(0, 10) : '' })
        } catch (e) { notify('danger', e.message); onClose() }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (!open) return; setDetail(null); setNote(''); setReplyTo(null); if (id) load(); else setV({ ...EMPTY, ...(presets || {}) }) }, [open, id, load, refreshKey])

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
            <FoldSection icon={<TbUsers />} tone="blue" title={tr("Pipeline and team")} open={openSec.includes('team')} onToggle={() => toggleSec('team')} summary={[opt(lk.statuses, v.statusId)?.label, opt(lk.sources, v.sourceId)?.label, names(v.assignedIds).join(', ')].filter(Boolean).join(' · ')}>
                <div className="grid grid-cols-2 gap-3">
                    <div><L>{tr("Status")}</L><Select size={sz} isDisabled={!canEdit} options={lk.statuses.filter((s) => s.isActive !== false || s.id === v.statusId).map((s) => ({ value: s.id, label: s.name }))} value={opt(lk.statuses, v.statusId)} onChange={(o) => set({ statusId: o?.value || null })} placeholder={tr("Default status")} /></div>
                    <div><L>{tr("Source")}</L><Select size={sz} isClearable isDisabled={!canEdit} formatOptionLabel={(o) => <span className="inline-flex items-center gap-2">{o.color && <i className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} />}{o.label}</span>} options={lk.sources.filter((s) => s.isActive !== false || s.id === v.sourceId).map((s) => ({ value: s.id, label: s.name, color: s.color }))} value={opt(lk.sources, v.sourceId)} onChange={(o) => set({ sourceId: o?.value || null })} /></div>
                    <div><L>{tr("Assigned to")}</L><Select size={sz} isMulti isDisabled={!canEdit} options={staff.map((s) => ({ value: s.id, label: s.name }))} value={staff.filter((s) => (v.assignedIds || []).includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} onChange={(o) => set({ assignedIds: (o || []).map((x) => x.value) })} placeholder={tr("Me")} /></div>
                    <div><L>{tr("Followers")}</L><Select size={sz} isMulti isDisabled={!canEdit} options={staff.map((s) => ({ value: s.id, label: s.name }))} value={staff.filter((s) => (v.followerIds || []).includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} onChange={(o) => set({ followerIds: (o || []).map((x) => x.value) })} placeholder={tr("Who should follow this lead")} /></div>
                    <div className="col-span-2 grid grid-cols-3 gap-3">
                        <div><L>{tr("Deal value")}{detail?.currency ? ` (${detail.currency})` : ''}</L><Input size={sz} type="number" min="0" disabled={!canEdit} value={v.value} placeholder="0" onChange={(e) => set({ value: e.target.value })} /></div>
                        <div><L>{tr("Chance of winning (%)")}</L><Input size={sz} type="number" min="0" max="100" disabled={!canEdit} value={v.probability} placeholder={tr("Status default")} onChange={(e) => set({ probability: e.target.value })} /></div>
                        <div><L>{tr("Expected closing")}</L><Input size={sz} type="date" disabled={!canEdit} value={v.expectedClose} onChange={(e) => set({ expectedClose: e.target.value })} /></div>
                    </div>
                    <div className="col-span-2"><L>{tr("DO:")}</L><Input size={sz} prefix={<TbTarget />} disabled={!canEdit} value={v.doText} maxLength={160} placeholder={tr("The next thing to do, shown on the card")} onChange={(e) => set({ doText: e.target.value })} /></div>
                    <div className="col-span-2 flex items-center justify-between text-sm"><span>{tr("Visible to the whole team")}</span><Switcher disabled={!canEdit} checked={v.isPublic} onChange={(c) => set({ isPublic: c })} /></div>
                </div>
            </FoldSection>
            <FoldSection icon={<TbAddressBook />} tone="emerald" title={tr("Contact")} open={openSec.includes('contact')} onToggle={() => toggleSec('contact')} summary={[v.name, v.company, v.email, v.phone, v.defaultLanguage && (LEAD_LANGUAGES.find((o) => o.value === v.defaultLanguage)?.label || v.defaultLanguage)].filter(Boolean).join(' · ')}>
                <div className="grid grid-cols-2 gap-3">
                    <div><L>{tr("Name")}</L><Input size={sz} disabled={!canEdit} value={v.name} onChange={(e) => set({ name: e.target.value })} /></div>
                    <div><L>{tr("Company")}</L><Input size={sz} disabled={!canEdit} value={v.company} onChange={(e) => set({ company: e.target.value })} /></div>
                    <div><L>{tr("Email")}</L><Input size={sz} disabled={!canEdit} value={v.email} onChange={(e) => set({ email: e.target.value })} /></div>
                    <div><L>{tr("Phone")}</L><Input size={sz} disabled={!canEdit} value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
                </div>
                {canEdit && <DuplicateWarning className="mt-3" email={v.email} phone={v.phone} company={v.company} leadId={edit ? id : undefined} />}
                <div className="mt-3 grid grid-cols-3 gap-3">
                    <div><L>{tr("Website")}</L><WebsiteField size={sz} disabled={!canEdit} value={v.website} onChange={(x) => set({ website: x })} /></div>
                    <div><L>{tr("Language")}</L><Select size={sz} isDisabled={!canEdit} isSearchable={false} isClearable options={LEAD_LANGUAGES} value={LEAD_LANGUAGES.find((o) => o.value === v.defaultLanguage) || null} placeholder={tr("Not set")} onChange={(o) => set({ defaultLanguage: o?.value || '' })} /></div>
                    <div><L>{tr("Position")}</L><Input size={sz} disabled={!canEdit} value={v.title} onChange={(e) => set({ title: e.target.value })} /></div>
                </div>
            </FoldSection>
            <FoldSection icon={<TbMapPin />} tone="amber" title={tr("Address")} open={openSec.includes('address')} onToggle={() => toggleSec('address')} summary={[v.address, v.city, v.state, v.zip, (lk.countries || []).find((o) => o.value === v.country)?.label].filter(Boolean).join(', ')}>
                <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-6"><L>{tr("Address")}</L><Input size={sz} disabled={!canEdit} value={v.address} onChange={(e) => set({ address: e.target.value })} /></div>
                    <div className="col-span-3"><L>{tr("City")}</L><Input size={sz} disabled={!canEdit} value={v.city} onChange={(e) => set({ city: e.target.value })} /></div>
                    <div className="col-span-3"><L>{tr("State")}</L><Input size={sz} disabled={!canEdit} value={v.state} onChange={(e) => set({ state: e.target.value })} /></div>
                    <div className="col-span-2"><L>{tr("ZIP")}</L><Input size={sz} disabled={!canEdit} value={v.zip} onChange={(e) => set({ zip: e.target.value })} /></div>
                    <div className="col-span-4"><L>{tr("Country")}</L><Select size={sz} isClearable isDisabled={!canEdit} placeholder={tr("Country")} options={lk.countries || []} value={(lk.countries || []).find((o) => o.value === v.country) || null} onChange={(o) => set({ country: o ? o.value : null })} /></div>
                </div>
            </FoldSection>
            <FoldSection icon={<TbFileText />} tone="violet" title={tr("Description")} open={openSec.includes('about')} onToggle={() => toggleSec('about')} summary={plainOf(v.description || '').replace(/\s+/g, ' ').slice(0, 140)}>
                <RichEditor minHeight={110} disabled={!canEdit} value={v.description} onChange={(html) => set({ description: html })} />
            </FoldSection>
        </div>
    )

    const notes = detail && (
        <div className="space-y-4">
            {!detail.can.closed && <div className="space-y-2"><ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} /><RichEditor minHeight={90} placeholder={tr("Log a call, a meeting or a thought")} value={note} onChange={setNote} onReady={(ed) => { editorRef.current = ed }} /><Button size="sm" variant="solid" disabled={!note.trim()} onClick={() => run(() => api(`/api/crm/pipeline/leads/${id}/notes`, { method: 'POST', body: { content: note, replyToId: replyTo?.id } }).then(() => { setNote(''); setReplyTo(null) }), tr("Note added"))}>{tr("Add comment")}</Button></div>}
            <CommentThread comments={detail.notes} render={(n) => (
                <div className="group relative flex gap-3">
                    <StaffRing id={n.by?.id} name={n.by?.name} size={30}><Avatar size={30} shape="circle" src={n.by?.image || undefined}>{initials(n.by?.name || '?')}</Avatar></StaffRing>
                    <div className="min-w-0 flex-1">
                        <div className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                            <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{n.by?.name || tr("Unknown")}</span><span>{dayjs(n.date).format('DD MMM YYYY, HH:mm')}{n.edited ? ` · ${tr('edited')}` : ''}</span></div>
                            {editingNote === n.id
                                ? <CommentEdit initial={n.content} onCancel={() => setEditingNote(null)} onSave={async (text) => { await api(`/api/crm/pipeline/leads/${id}/notes`, { method: 'PUT', body: { noteId: n.id, content: text } }); setEditingNote(null); await load() }} />
                                : <RichView html={n.content} />}
                        </div>
                        {editingNote !== n.id && <CommentFoot remind={{ relType: 'lead', relId: id, tab: 'notes', assignedIds: l?.assignedIds || [], note: plainOf(n.content).slice(0, 140) }} onMention={(sid) => run(() => api(`/api/crm/pipeline/leads/${id}/notes`, { method: 'POST', body: { noteId: n.id, mention: sid } }), tr('Colleague mentioned'))} reactions={n.reactions} onReact={(emoji) => run(() => api(`/api/crm/pipeline/leads/${id}/notes`, { method: 'POST', body: { noteId: n.id, react: emoji } }))} share={{ url: `/crm/leads/${id}?tab=notes`, title: l?.name, text: `${n.by?.name ? `${n.by.name}: ` : ''}${plainOf(n.content)}` }} onReply={() => { setReplyTo({ id: n.id, name: n.by?.name || tr('Unknown') }); startReply(editorRef.current, n.by?.name) }} onEdit={n.canEdit ? () => setEditingNote(n.id) : null} onDelete={n.canDelete ? () => run(() => api(`/api/crm/pipeline/leads/${id}/notes?noteId=${n.id}`, { method: 'DELETE' })) : null} />}
                    </div>
                </div>
            )} />
            {!detail.notes.length && <p className="text-sm text-gray-500">{tr("No comments yet.")}</p>}
        </div>
    )

    const related = detail && (
        <div className="space-y-6">
            <div>
                <div className="mb-2 flex items-center justify-between"><h6>{tr("Proposals")}</h6><div className="flex flex-wrap justify-end gap-1.5"><Button size="xs" icon={<TbFileText />} data-href={`/crm/proposals/new?leadId=${id}`} onClick={() => nav(`/crm/proposals/new?leadId=${id}`)}>{tr("New proposal")}</Button>
                    {/* an estimate or an invoice is made for a client: a lead not converted yet becomes one first (asked before) */}
                    {[['estimates', tr("New estimate"), <TbReceipt key="e" />], ['invoices', tr("New invoice"), <TbFileInvoice key="i" />]].filter(([k]) => can(k, 'create') && (l.clientId || detail.can.convert)).map(([k, label, icon]) => <Button key={k} size="xs" icon={icon} onClick={() => (l.clientId ? (onClose(), nav(`/crm/${k}/new?clientId=${l.clientId}`)) : setDocFor(k))}>{label}</Button>)}</div></div>
                <div className="space-y-2">{detail.proposals.map((p) => (
                    <Link key={p.id} to={`/crm/proposals/${p.id}`} className="block rounded-xl border border-gray-200/80 bg-gray-50/70 p-3 transition hover:border-primary/40 hover:bg-white dark:border-gray-700 dark:bg-gray-800/60">
                        <div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-sm font-semibold">{p.subject || tr("Proposal {number}", { number: p.number })}</span><Tag>{PROPOSAL[p.status] || p.status}</Tag></div>
                        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 text-xs text-gray-500">
                            <span className="flex flex-col gap-0.5"><span>#{p.number}{p.date ? ` · ${dayjs(p.date).format('DD MMM YYYY')}` : ''}</span>{p.by && <span>{tr("Created by")} <b className="font-semibold text-gray-700 dark:text-gray-200">{p.by}</b></span>}</span>
                            <span className="text-base font-bold text-gray-800 dark:text-gray-100">{p.total != null ? `${Number(p.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${p.currency || detail.currency || ''}` : '—'}</span>
                        </div>
                    </Link>
                ))}</div>
                {!detail.proposals.length && <p className="text-sm text-gray-500">{tr("No proposals yet.")}</p>}
            </div>
        </div>
    )

    const activity = detail && <ActivityFeed items={detail.activity} empty={tr("Nothing logged yet.")} />

    const headActions = l && (
        <>
            {detail.can.convert && <button type="button" className="rp-qv-act is-solid" onClick={() => setConfirm('convert')}><TbUserCheck />{tr("Convert to client")}</button>}
            {!detail.can.closed && !l.lost && !l.junk && <button type="button" className="rp-qv-act" onClick={() => flag('lost', tr("Marked as lost"))}><TbBan />{tr("Lost")}</button>}
            {!detail.can.closed && !l.lost && !l.junk && <button type="button" className="rp-qv-act" onClick={() => flag('junk', tr("Marked as junk"))}><TbBan />{tr("Junk")}</button>}
            {!detail.can.closed && (l.lost || l.junk) && <button type="button" className="rp-qv-act" onClick={() => flag('restore', tr("Lead restored"))}><TbArrowBackUp />{tr("Restore")}</button>}
        </>
    )

    const headerBadges = l && (l.lost || l.junk || l.client) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            {l.lost && <Tag className="bg-red-100 text-red-600">{tr("Lost")}</Tag>}{l.junk && <Tag className="bg-amber-100 text-amber-700">{tr("Junk")}</Tag>}
            {l.client && <Link className="text-primary hover:underline" to={`/crm/clients/${l.client.id}`}>{tr("→ client")} {l.client.company}</Link>}
        </div>
    )

    return (
        <Drawer
            compact={edit}
            meta={edit && l?.assignees?.length ? <People list={l.assignees} max={5} size={28} /> : null}
            share={edit ? { url: `/crm/leads/${id}`, title: l?.name, text: l?.name } : undefined}
            title={edit ? l?.name || tr("Lead") : tr("New lead")} kicker={edit ? `${tr("Lead")}${l?.company ? ` · ${l.company}` : ''}` : tr("New lead")} sub={l?.company} date={l?.lastContact ? `${tr("Last contact")} ${dayjs(l.lastContact).format('DD MMM')}` : ''} team={l?.assignees?.length ? <People list={l.assignees} max={5} size={30} /> : null} actions={edit && detail?.can.edit && l ? headActions : null} stage={stage} isOpen={open} onClose={onClose} width={640}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && !l?.converted && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm('delete')}>{tr("Delete")}</Button>}
                    {edit && !detail?.can.closed && <RemindMe relType="lead" relId={id} />}
                    <div className="ml-auto flex gap-2"><Button onClick={onClose}>{canEdit ? tr("Cancel") : tr("Close")}</Button>{canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? tr("Save changes") : tr("Create lead")}</Button>}</div>
                </div>
            }
        >
            {edit && !detail ? <div className="py-10 text-center text-gray-500">{tr("Loading…")}</div> : edit ? (
                <>
                    {detail?.can.closed && <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{tr("This lead already became a customer. Only an admin can change it.")}</div>}
                    {headerBadges}
                    <Tabs value={tabV} onChange={setTabV}>
                        <Tabs.TabList>
                            {tabOk.profile && <Tabs.TabNav value="profile">{tr("Profile")}</Tabs.TabNav>}
                            {can('tasks', 'view') && <Tabs.TabNav value="tasks">{tr("Tasks")}</Tabs.TabNav>}
                            {tabOk.mails && <Tabs.TabNav value="mails">{tr("Mails")}{detail.mails.length ? ` (${detail.mails.length})` : ''}</Tabs.TabNav>}
                            {tabOk.meetings && <Tabs.TabNav value="meetings">{tr("Meetings")}{detail.meetings.length ? ` (${detail.meetings.length})` : ''}</Tabs.TabNav>}
                            <Tabs.TabNav value="files">{tr("Files")}</Tabs.TabNav>
                            <Tabs.TabNav value="notes">{tr("Comments")}{detail.notes.length ? ` (${detail.notes.length})` : ''}</Tabs.TabNav>
                            {tabOk.offers && <Tabs.TabNav value="related">{tr("Offers")}{detail.proposals.length ? ` (${detail.proposals.length})` : ''}</Tabs.TabNav>}
                            {tabOk.activity && <Tabs.TabNav value="activity">{tr("Activity")}</Tabs.TabNav>}
                        </Tabs.TabList>
                        <div className="pt-4">
                            {tabOk.profile && <Tabs.TabContent value="profile">{profile}</Tabs.TabContent>}
                            {can('tasks', 'view') && <Tabs.TabContent value="tasks"><LeadTasks leadId={id} staff={staff} onChanged={onChanged} locked={!!detail.can.closed} /></Tabs.TabContent>}
                            {tabOk.mails && <Tabs.TabContent value="mails"><LeadMails leadId={id} mails={detail.mails} senders={detail.senders || []} leadEmail={detail.lead?.email || ''} canEdit={!!detail.can.edit} mailRights={detail.can.mail} mentionable={detail.mentionable || []} run={run} /></Tabs.TabContent>}
                            {tabOk.meetings && <Tabs.TabContent value="meetings"><LeadMeetings leadId={id} leadName={l.name} meetings={detail.meetings} staff={staff} canEdit={!!detail.can.edit} run={run} /></Tabs.TabContent>}
                            <Tabs.TabContent value="files"><div className="pt-1"><AttachmentsPanel relType="lead" relId={id} canEdit={!!detail.can.edit} /></div></Tabs.TabContent>
                            <Tabs.TabContent value="notes">{notes}</Tabs.TabContent>
                            {tabOk.offers && <Tabs.TabContent value="related">{related}</Tabs.TabContent>}
                            {tabOk.activity && <Tabs.TabContent value="activity">{activity}</Tabs.TabContent>}
                        </div>
                    </Tabs>
                </>
            ) : profile}
            <ConfirmDialog isOpen={confirm === 'delete'} type="danger" title={tr("Delete this lead?")} confirmText={tr("Delete")} onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); run(() => api(`/api/crm/pipeline/leads/${id}`, { method: 'DELETE' }), tr("Lead deleted"), onClose) }}>
                <p>{tr("The lead, its notes and its activity are removed for good.")}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={!!docFor} type="info" title={tr("Convert to a client first?")} confirmText={tr("Convert and continue")} onClose={() => setDocFor(null)} onCancel={() => setDocFor(null)} onConfirm={() => { const k = docFor; setDocFor(null); run(() => api(`/api/crm/pipeline/leads/${id}/convert`, { method: 'POST', body: { includeNotes: withNotes } }), tr("Client created"), (r) => { onClose(); nav(`/crm/${k}/new?clientId=${r.clientId}`) }) }}>
                <p>{docFor === 'invoices' ? tr("An invoice is made for a client. This lead becomes a client (with its first contact), then the new invoice opens for it.") : tr("An estimate is made for a client. This lead becomes a client (with its first contact), then the new estimate opens for it.")}</p>
                <label className="mt-3 flex items-center gap-2 text-sm"><Switcher checked={withNotes} onChange={setWithNotes} />{tr("Copy the lead notes to the client")}</label>
            </ConfirmDialog>
            <ConfirmDialog isOpen={confirm === 'convert'} type="info" title={tr("Convert to a client?")} confirmText={tr("Convert")} onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); run(() => api(`/api/crm/pipeline/leads/${id}/convert`, { method: 'POST', body: { includeNotes: withNotes } }), tr("Client created"), (r) => { onClose(); nav(`/crm/clients/${r.clientId}`) }) }}>
                <p>{tr("A client and its first contact are created from this lead.")}</p>
                <label className="mt-3 flex items-center gap-2 text-sm"><Switcher checked={withNotes} onChange={setWithNotes} />{tr("Copy the lead notes to the client")}</label>
            </ConfirmDialog>
        </Drawer>
    )
}

export default LeadDrawer
