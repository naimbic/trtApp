/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { TbUpload, TbPhotoSearch, TbLink, TbPlus, TbTrash, TbPencil, TbVideo, TbMapPin, TbBell, TbCalendarEvent, TbArrowDownLeft, TbArrowUpRight, TbSend, TbFileText, TbSquare, TbSquareCheck, TbX, TbClockPlay, TbPaperclip, TbSearch, TbAt, TbEye, TbEyeOff, TbPointer } from 'react-icons/tb'
import dayjs from 'dayjs'
import RichView from '@/components/crm/RichView'
import RichEditor from '@/components/crm/RichEditor'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Switcher from '@/components/ui/Switcher'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import MediaPicker from '@/components/crm/MediaPicker'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify, qs, upload, useCan } from '../kit/api'
import ChecklistPanel from '@/components/crm/ChecklistPanel'
import TaskDrawer from '../tasks/TaskDrawer'
import { People, useTaskStatuses } from '../tasks/shared'
import { CommentFoot } from '@/components/crm/CommentParts'
import { viewedOn } from '@/utils/viewedOn'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const card = 'group relative rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50'
const when = (d) => dayjs(d).format('DD MMM YYYY, HH:mm')

/**
 * The tasks of the lead, right in its popup, with the same panel as a task's checklist: tick, rename in place, a date, one or several
 * people, delete; "@" and "#" work in the name. The arrow opens the full task popup. Every task created here is linked to the lead.
 */
export const LeadTasks = ({ leadId, staff, onChanged, asTasks = true, plain = [], locked = false }) => {
    if (!asTasks) return <LeadPlainChecklist leadId={leadId} staff={staff} initial={plain} onChanged={onChanged} locked={locked} />
    return <LeadTaskList leadId={leadId} staff={staff} onChanged={onChanged} locked={locked} />
}

/** The lead's checklist kept as plain lines on the lead itself (Settings > Leads): no task is created for an item. */
const LeadPlainChecklist = ({ leadId, staff, initial, onChanged, locked = false }) => {
    const can = useCan()
    const [items, setItems] = useState(initial)
    useEffect(() => setItems(initial), [JSON.stringify(initial)]) // eslint-disable-line react-hooks/exhaustive-deps
    const act = async (op) => {
        try {
            const r = await api(`/api/crm/pipeline/leads/${leadId}/checklist`, { method: 'POST', body: op })
            setItems(r.checklist || []); onChanged?.()
        } catch (e) { notify('danger', e.message) }
    }
    return (
        <ChecklistPanel title={tr("Checklist")} items={items} staff={staff} canEdit={!locked && can('leads', 'edit')} canDelete={!locked && can('leads', 'edit')} reminders={false}
            placeholder={tr("Add an item for this lead")} empty={tr("No items yet.")} act={act} />
    )
}

const LeadTaskList = ({ leadId, staff, onChanged, locked = false }) => {
    useTaskStatuses()
    const can = useCan()
    const [list, setList] = useState(null)
    const [popup, setPopup] = useState({ open: false, id: null, k: 0 })
    const live = useRef({}) // the people of each task as the person sees them now, so two quick clicks never overwrite each other
    const queue = useRef(Promise.resolve())
    const busy = useRef(0) // changes still being saved: the list is only re-read when none is left, so a slow answer never undoes the next click
    const load = useCallback(async () => {
        try { setList((await api(`/api/crm/work/tasks?${qs({ relType: 'lead', relId: leadId, done: '1' })}`)).list || []) } catch (e) { notify('danger', e.message); setList([]) }
    }, [leadId])
    useEffect(() => { load() }, [load])
    const items = useMemo(() => (list || []).map((t) => ({ id: t.id, description: t.name, finished: t.status === 5, dueDate: t.dueDate, hours: t.hours, assignedIds: (t.assignees || []).map((x) => x.id), canFinish: t.canFinish, stats: { steps: [t.checklistDone || 0, t.checklistTotal || 0], subtasks: t.subtasks, comments: t.comments || 0, files: t.files || 0 } })), [list])
    useEffect(() => { live.current = Object.fromEntries(items.map((i) => [i.id, i.assignedIds])) }, [items])
    const changed = async () => { await load(); onChanged?.() }
    // read the task, change one thing, save it back (the same way the board menu does)
    const patch = (id, change) => {
        queue.current = queue.current.then(async () => {
            const d = await api(`/api/crm/work/tasks/${id}`), t = d.task
            await api(`/api/crm/work/tasks/${id}`, { method: 'PUT', body: { ...t, startDate: t.startDate ? dayjs(t.startDate).format('YYYY-MM-DD') : null, dueDate: t.dueDate ? dayjs(t.dueDate).format('YYYY-MM-DD') : null, assigneeIds: t.assigneeIds, followerIds: t.followerIds, ...change } })
        })
        return queue.current
    }
    const act = async (op) => {
        busy.current += 1
        try {
            if (op.action === 'add') await api('/api/crm/work/tasks', { method: 'POST', body: { name: op.description, relType: 'lead', relId: leadId, dueDate: op.dueDate || null, hours: op.hours || null, assigneeIds: op.assignedIds || [] } })
            else if (op.action === 'toggle') await api(`/api/crm/work/tasks/${op.itemId}/move`, { method: 'POST', body: { status: op.finished ? 5 : 1 } })
            else if (op.action === 'delete') await api(`/api/crm/work/tasks/${op.itemId}`, { method: 'DELETE' })
            else if (op.action === 'reorder') await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { ids: op.ids } })
            else if (op.action === 'update') {
                const change = {}
                if (op.description !== undefined) change.name = op.description
                if (op.hours !== undefined) change.hours = op.hours
                if (op.dueDate !== undefined) change.dueDate = op.dueDate ? dayjs(op.dueDate).format('YYYY-MM-DD') : null
                if (op.assignedIds) { live.current[op.itemId] = op.assignedIds; change.assigneeIds = op.assignedIds }
                if (op.toggleAssignee) { const cur = live.current[op.itemId] || []; const next = cur.includes(op.toggleAssignee) ? cur.filter((x) => x !== op.toggleAssignee) : [...cur, op.toggleAssignee]; live.current[op.itemId] = next; change.assigneeIds = next }
                await patch(op.itemId, change)
            } else return
            if (busy.current === 1) await changed()
        } catch (e) { notify('danger', e.message); if (busy.current === 1) await load() } finally { busy.current -= 1 }
    }
    return (
        <div className="space-y-3">
            {list === null ? <p className="text-sm text-gray-500">{tr("Loading…")}</p> : (
                <ChecklistPanel title={tr("Tasks")} items={items} staff={staff} canEdit={!locked && can('tasks', 'edit') && can('tasks', 'create')} canDelete={!locked && can('tasks', 'delete')} reminders={false}
                    placeholder={tr("Add a task for this lead (@ to mention, # for a tag)")} empty={tr("No tasks for this lead yet.")} act={act} onOpen={(i) => setPopup({ open: true, id: i.id, k: popup.k + 1 })} />
            )}
            {!locked && can('tasks', 'create') && <Button size="sm" icon={<TbPlus />} onClick={() => setPopup({ open: true, id: null, k: popup.k + 1 })}>{tr("New task with all its details")}</Button>}
            <TaskDrawer open={popup.open} id={popup.id} staff={staff} refreshKey={popup.k} presets={{ relType: 'lead', relId: leadId }} onClose={() => setPopup((p) => ({ ...p, open: false }))} onChanged={changed} />
        </div>
    )
}

const MAIL_EMPTY = () => ({ direction: 'in', date: new Date(), from: '', to: '', cc: '', bcc: '', replyTo: '', note: '', checks: [], scheduledAt: null, subject: '', body: '' })

/** Emails sent to or received from the lead, written in the editor with their date and time. Mails read by the lead mailbox land here too. */
export const LeadMails = ({ leadId, mails: allMails, senders = [], leadEmail = '', canEdit: canEditProp, mailRights, mentionable = [], run, kind = 'lead', allowDelete = true, base = `/api/crm/pipeline/leads/${leadId}` }) => {
    const mr = mailRights || { create: !!canEditProp, edit: !!canEditProp, send: !!canEditProp, delete: !!canEditProp } // Roles > Lead mails / Client mails: Create, Edit, Send, Delete
    const canEdit = mr.create
    const [form, setForm] = useState(null) // { id?, ...fields }
    const [commenting, setCommenting] = useState(null)
    const [commentText, setCommentText] = useState('')
    const [fil, setFil] = useState({ q: '', from: '', to: '', files: false, dir: '' })
    // the mails shown: by words, by date and by attached files
    const mails = useMemo(() => allMails.filter((m) => {
        const d = dayjs(m.date)
        if (fil.from && d.isBefore(dayjs(fil.from).startOf('day'))) return false
        if (fil.to && d.isAfter(dayjs(fil.to).endOf('day'))) return false
        if (fil.files && !(m.files || []).length) return false
        if (fil.dir && m.direction !== fil.dir) return false
        const q = fil.q.trim().toLowerCase()
        if (q && !`${m.subject} ${m.from} ${m.to} ${String(m.body || '').replace(/<[^>]+>/g, ' ')} ${(m.files || []).map((f) => f.name).join(' ')}`.toLowerCase().includes(q)) return false
        return true
    }), [allMails, fil])
    const filtering = !!(fil.q || fil.from || fil.to || fil.files || fil.dir)
    const [del, setDel] = useState(null)
    const [send, setSend] = useState(null)
    const set = (p) => setForm((f) => ({ ...f, ...p }))
    const draft = form?.direction === 'draft'
    const [more, setMore] = useState(false)
    const formRef = useRef(null)
    // opening the form (new draft, log a mail, edit) brings it into view, whatever the scroll position of the list
    useEffect(() => { if (form && formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [!!form, form?.id]) // eslint-disable-line react-hooks/exhaustive-deps
    const [newCheck, setNewCheck] = useState('')
    const [askWho, setAskWho] = useState('') // a colleague who must confirm the check (only those who may send mails)
    const addCheck = () => { const t = newCheck.trim(); if (t) { set({ checks: [...(form.checks || []), { text: t, done: false, ...(askWho ? { staffId: askWho, person: mentionable.find((p) => p.id === askWho)?.name || '' } : {}) }] }); setNewCheck(''); setAskWho('') } }
    // attach to a draft: the three buttons work on a draft that is not saved yet (it is saved first)
    const [picker, setPicker] = useState(false)
    const [linkBox, setLinkBox] = useState(null) // { url, text }
    const [attKey, setAttKey] = useState(0)
    const fileInput = useRef(null)
    const ensureDraft = async () => {
        if (form.id) return form.id
        const r = await api(`${base}/mails`, { method: 'POST', body: { ...form, mailId: undefined, date: new Date(form.date).toISOString(), scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null } })
        setForm((f) => ({ ...f, id: f.id || r?.id }))
        return r?.id
    }
    const uploadFiles = async (files) => {
        const list = [...(files || [])]
        if (fileInput.current) fileInput.current.value = ''
        if (!list.length) return
        try {
            const id = await ensureDraft()
            const fd = new FormData()
            list.forEach((f) => fd.append('files', f)); fd.append('relType', 'leadmail'); fd.append('relId', id)
            const r = await upload('/api/crm/media/upload', fd)
            r.errors?.forEach((e) => notify('danger', `${e.name}: ${e.error}`))
            if (r.saved?.length) notify('success', tr('{n} done', { n: r.saved.length }))
            setAttKey((k) => k + 1)
            run(async () => {}, null, () => {})
        } catch (e) { notify('danger', e.message) }
    }
    const attachFromFiles = async (m) => {
        setPicker(false)
        try {
            const id = await ensureDraft()
            await api('/api/crm/media', { method: 'POST', body: { action: 'attach', mediaId: m.id, relType: 'leadmail', relId: id } })
            notify('success', tr('File attached')); setAttKey((k) => k + 1)
            run(async () => {}, null, () => {})
        } catch (e) { notify('danger', e.message) }
    }
    const addLink = () => {
        const raw = (linkBox?.url || '').trim()
        if (!raw) return
        const url = /^(https?:|mailto:)/i.test(raw) ? raw : `https://${raw}`
        const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
        set({ body: `${form.body || ''}<p><a href="${esc(url)}">${esc((linkBox.text || '').trim() || raw)}</a></p>` })
        setLinkBox(null)
    }
    const [toggling, setToggling] = useState(false) // one click at a time: each one rewrites the list of checks
    const toggle = (m, i) => { if (toggling) return; setToggling(true); run(() => api(`${base}/mails/send`, { method: 'POST', body: { action: 'check', mailId: m.id, index: i, done: !m.checks[i].done } }), null).finally(() => setToggling(false)) }
    const save = () => run(() => api(`${base}/mails`, { method: form.id ? 'PUT' : 'POST', body: { ...form, mailId: form.id, date: new Date(form.date).toISOString(), scheduledAt: draft && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null } }).then((r) => { if (r?.scheduleCancelled) notify('warning', tr("The text changed, so the checks and the schedule were cancelled. Confirm the checks, then schedule it again.")); if (draft) setForm((f) => ({ ...f, id: f.id || r?.id })); else setForm(null) }), draft ? tr("Draft saved") : tr("Mail saved"))
    // the lead is the other side of every mail: received = from the lead, sent or draft = to the lead (and a draft goes out from our own sender)
    const aim = (f, dir) => {
        const lead = leadEmail.trim()
        const ours = (e) => !e || senders.includes(e)
        if (dir === 'in') return { ...f, direction: dir, from: !f.from || ours(f.from) ? lead : f.from, to: f.to === lead ? '' : f.to }
        return { ...f, direction: dir, to: !f.to || f.to === lead ? lead : f.to, from: f.from === lead || (dir === 'draft' && !f.from) ? (dir === 'draft' ? senders[0] || '' : '') : f.from }
    }
    const newDraft = () => { setMore(false); setForm(aim(MAIL_EMPTY(), 'draft')) }
    // answer a received mail: a draft to the sender, "Re: subject", with the mail quoted
    const replyTo = (m) => {
        setMore(false)
        const base0 = aim(MAIL_EMPTY(), 'draft')
        setForm({ ...base0, to: m.direction === 'in' ? m.from || leadEmail : m.to || leadEmail, subject: /^re\s*:/i.test(m.subject || '') ? m.subject : `Re: ${m.subject || ''}`, body: `<p></p><blockquote><p>${dayjs(m.date).format('DD MMM YYYY, HH:mm')} · ${m.from || ''}</p>${m.body || ''}</blockquote>` })
    }
    return (
        <div className="space-y-4">
            {form && (
                <div ref={formRef} className="scroll-mt-2 space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-3">
                        <div><L>{tr("Type")}</L><Segment size="sm" value={form.direction} onChange={(v) => setForm((f) => (f.id ? { ...f, direction: Array.isArray(v) ? v[0] : v } : aim(f, Array.isArray(v) ? v[0] : v)))}><Segment.Item value="in">{tr("Received")}</Segment.Item><Segment.Item value="out">{tr("Sent")}</Segment.Item><Segment.Item value="draft">{tr("Draft")}</Segment.Item></Segment></div>
                        <div><L>{tr("Date and time")}</L><DatePicker.DateTimepicker value={form.date} onChange={(d) => set({ date: d || new Date() })} /></div>
                        <div><L>{tr("From")}</L>{draft && senders.length ? <Select size="sm" isSearchable={false} options={senders.map((e) => ({ value: e, label: e }))} value={form.from ? { value: form.from, label: form.from } : null} onChange={(o) => set({ from: o?.value || '' })} /> : <Input size="sm" value={form.from} placeholder="name@company.com" onChange={(e) => set({ from: e.target.value })} />}</div>
                        <div><L>{tr("To")}</L><Input size="sm" value={form.to} placeholder="name@company.com" onChange={(e) => set({ to: e.target.value })} /></div>
                    </div>
                    {draft && (more || form.cc || form.bcc || form.replyTo ? (
                        <div className="grid grid-cols-3 gap-3">
                            <div><L>{tr("Cc")}</L><Input size="sm" value={form.cc} onChange={(e) => set({ cc: e.target.value })} /></div>
                            <div><L>{tr("Bcc")}</L><Input size="sm" value={form.bcc} onChange={(e) => set({ bcc: e.target.value })} /></div>
                            <div><L>{tr("Reply to")}</L><Input size="sm" value={form.replyTo} onChange={(e) => set({ replyTo: e.target.value })} /></div>
                        </div>
                    ) : <button type="button" className="text-xs text-primary" onClick={() => setMore(true)}>{tr("Add Cc, Bcc or Reply to")}</button>)}
                    {draft && <p className="text-xs text-gray-500">{tr("Several addresses can be separated by commas. The date becomes the sending time when you send.")}</p>}
                    <div><L>{tr("Subject")}</L><Input size="sm" value={form.subject} onChange={(e) => set({ subject: e.target.value })} /></div>
                    <div><L>{tr("Mail")}</L><RichEditor minHeight={140} value={form.body} placeholder={tr("Paste or write the mail here")} onChange={(html) => set({ body: html })} /></div>
                    {draft && mr.send && (
                        <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 dark:border-sky-500/30 dark:bg-sky-500/5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm font-semibold">
                                    <Switcher checked={!!form.scheduledAt} onChange={(c) => set({ scheduledAt: c ? dayjs().add(1, 'day').hour(9).minute(0).second(0).toDate() : null })} />
                                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><TbClockPlay className="shrink-0" />{tr("Send automatically")}</span>
                                </label>
                                {form.scheduledAt && <div className="w-full sm:w-56"><DatePicker.DateTimepicker size="sm" value={form.scheduledAt} onChange={(d) => set({ scheduledAt: d || null })} /></div>}
                            </div>
                            {form.scheduledAt && <p className="mt-1.5 text-xs text-gray-500">{tr("It is sent at the first run of the automatic tasks after that time, from the address chosen above. Every check must be confirmed first.")}</p>}
                        </div>
                    )}
                    {draft && (
                        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/60 p-2.5 dark:border-red-500/30 dark:bg-red-500/5">
                            <div><L>{tr("Note for whoever sends it")}</L><Input size="sm" textArea rows={2} value={form.note || ''} placeholder={tr("What to do, change or check before sending (not sent to the lead)")} onChange={(e) => set({ note: e.target.value })} /></div>
                            <div>
                                <L>{tr("Checks to confirm before sending")}</L>
                                <div className="mb-1.5 flex flex-wrap gap-1.5">
                                    {(form.checks || []).map((c, i) => <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${c.staffId ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-700'}`}>{c.staffId && <TbAt />}{c.person ? <b>{c.person}</b> : null}{c.text}<button type="button" aria-label={tr("Remove")} onClick={() => set({ checks: form.checks.filter((_, j) => j !== i) })}><TbX /></button></span>)}
                                </div>
                                <div className="flex flex-wrap gap-2">{mentionable.length > 0 && <select aria-label={tr("Ask a colleague to confirm")} value={askWho} onChange={(e) => setAskWho(e.target.value)} className="h-8 max-w-[11rem] rounded-lg border border-gray-300 bg-white px-2 text-xs dark:border-gray-600 dark:bg-gray-800"><option value="">{tr("Anyone confirms")}</option>{mentionable.map((p) => <option key={p.id} value={p.id}>@ {p.name}</option>)}</select>}<Input className="min-w-[10rem] flex-1" size="sm" value={newCheck} placeholder={askWho ? tr("What must they confirm? Then press Enter") : tr("Add a check, then press Enter")} onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheck() } }} /><Button size="sm" onClick={addCheck}>{tr("Add")}</Button></div>
                            </div>
                        </div>
                    )}
                    {draft && (
                        <div>
                            <L>{tr("Attachments")}</L>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Tooltip title={tr("Upload files")}><Button size="sm" icon={<TbUpload />} onClick={() => fileInput.current?.click()} /></Tooltip>
                                <Tooltip title={tr("From files")}><Button size="sm" icon={<TbPhotoSearch />} onClick={() => setPicker(true)} /></Tooltip>
                                <Tooltip title={tr("Add a link")}><Button size="sm" icon={<TbLink />} onClick={() => setLinkBox(linkBox ? null : { url: '', text: '' })} /></Tooltip>
                                <span className="text-xs text-gray-500">{tr("Up to 10 MB per file, 20 MB in all.")}</span>
                                <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                                <MediaPicker open={picker} kind="" onClose={() => setPicker(false)} onPick={attachFromFiles} />
                            </div>
                            {linkBox && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Input size="sm" className="min-w-[200px] flex-1" autoFocus value={linkBox.url} placeholder="https://…" onChange={(e) => setLinkBox({ ...linkBox, url: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
                                    <Input size="sm" className="min-w-[160px] flex-1" value={linkBox.text} placeholder={tr("Text to show (optional)")} onChange={(e) => setLinkBox({ ...linkBox, text: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
                                    <Button size="sm" variant="solid" disabled={!linkBox.url.trim()} onClick={addLink}>{tr("Add")}</Button>
                                </div>
                            )}
                            {form.id && <div className="mt-2"><AttachmentsPanel key={attKey} listOnly relType="leadmail" relId={form.id} canEdit maxMb={10} /></div>}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2"><Button size="sm" variant="solid" onClick={save}>{draft ? tr("Save draft") : tr("Save mail")}</Button><Button size="sm" onClick={() => setForm(null)}>{draft && form.id ? tr("Close") : tr("Cancel")}</Button></div>
                </div>
            )}
            {(allMails.length > 0 || (canEdit && !form)) && (
                <div className="flex flex-nowrap items-center gap-1.5 rounded-xl border border-gray-200 p-1.5 dark:border-gray-700">
                    {canEdit && !form && <><Tooltip title={tr("Log a mail")}><Button size="sm" className="shrink-0" icon={<TbPlus />} onClick={() => setForm(aim(MAIL_EMPTY(), 'in'))} /></Tooltip><Tooltip title={tr("New draft")}><Button size="sm" className="shrink-0" icon={<TbFileText />} onClick={newDraft} /></Tooltip></>}
                    {allMails.length > 0 && (
                        <>
                            <div className="min-w-0 flex-1"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search the mails")} value={fil.q} onChange={(e) => setFil((f) => ({ ...f, q: e.target.value }))} /></div>
                            <div className="w-44 shrink-0"><DatePicker.DatePickerRange size="sm" placeholder={tr("Date period")} inputFormat="DD MMM" value={[fil.from ? dayjs(fil.from).toDate() : null, fil.to ? dayjs(fil.to).toDate() : null]} onChange={(v) => setFil((f) => ({ ...f, from: v?.[0] ? dayjs(v[0]).format('YYYY-MM-DD') : '', to: v?.[1] ? dayjs(v[1]).format('YYYY-MM-DD') : '' }))} /></div>
                            <Select size="sm" className="w-28 shrink-0" isClearable isSearchable={false} placeholder={tr("All")} options={[{ value: 'in', label: tr('Received') }, { value: 'out', label: tr('Sent') }, { value: 'draft', label: tr('Drafts') }]} value={fil.dir ? { value: fil.dir, label: fil.dir === 'in' ? tr('Received') : fil.dir === 'out' ? tr('Sent') : tr('Drafts') } : null} onChange={(o) => setFil((f) => ({ ...f, dir: o?.value || '' }))} />
                            <Tooltip title={tr("With files")}><Button size="sm" className={`shrink-0 ${fil.files ? 'bg-primary/10 text-primary' : ''}`} icon={<TbPaperclip />} onClick={() => setFil((f) => ({ ...f, files: !f.files }))} /></Tooltip>
                            {filtering && <Tooltip title={tr("Clear")}><Button size="sm" className="shrink-0" icon={<TbX />} onClick={() => setFil({ q: '', from: '', to: '', files: false, dir: '' })} /></Tooltip>}
                        </>
                    )}
                </div>
            )}
            {mails.map((m) => (
                <div key={m.id} className={card}>
                    <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2"><Tag className={m.direction === 'draft' ? 'bg-amber-100 text-amber-700' : m.direction === 'out' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}>{m.direction === 'draft' ? <TbFileText className="inline" /> : m.direction === 'out' ? <TbArrowUpRight className="inline" /> : <TbArrowDownLeft className="inline" />} {m.direction === 'draft' ? tr("Draft") : m.direction === 'out' ? tr("Sent") : tr("Received")}</Tag><span className="truncate font-semibold heading-text">{m.subject || tr("(no subject)")}</span></div>
                            <div className="mt-0.5 text-xs text-gray-500">{[m.from && `${tr("From")} ${m.from}`, m.to && `${tr("To")} ${m.to}`, m.cc && `${tr("Cc")} ${m.cc}`].filter(Boolean).join(' · ')}</div>
                        </div>
                        <div className="shrink-0 text-end text-xs text-gray-500"><div>{when(m.date)}</div>{m.source === 'mailbox' && <div className="text-[11px]">{tr("from the mailbox")}</div>}</div>
                    </div>
                    {m.body && <div className="max-h-56 overflow-auto"><RichView html={m.body} /></div>}
                    {m.direction !== 'draft' && (m.files || []).length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{m.files.map((f) => <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold hover:bg-gray-200 dark:bg-gray-700/50 dark:hover:bg-gray-700"><TbPaperclip className="shrink-0" /><span className="truncate">{f.name}</span></a>)}</div>}
                    {m.direction === 'out' && m.track?.tracked && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                            {m.track.opens > 0
                                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700" title={m.track.opens > 1 ? `${tr("Last viewed")} ${when(m.track.lastOpenAt)}` : undefined}><TbEye />{viewedOn(m.track.firstOpenAt)}{m.track.opens > 1 ? ` · ${m.track.opens}×` : ''}</span>
                                : <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-500 dark:bg-gray-700/50 dark:text-gray-300" title={tr("Not seen yet. Mail apps that block pictures never show an open.")}><TbEyeOff />{tr("Not viewed yet")}</span>}
                            {m.track.clicks > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-700" title={`${tr("First click")} ${when(m.track.firstClickAt)}`}><TbPointer />{tr("Link clicked")} {m.track.clicks > 1 ? `${m.track.clicks}×` : ''} · {when(m.track.lastClickAt)}</span>}
                        </div>
                    )}
                    {m.direction === 'draft' && m.scheduledAt && <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700"><TbClockPlay />{tr("Scheduled for")} {when(m.scheduledAt)}</div>}
                    {m.direction === 'draft' && m.sendError && <div className="mt-2 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700">{tr("Not sent automatically")}: {m.sendError}</div>}
                    {m.direction === 'draft' && (m.note || m.checks.length > 0) && (
                        <div className="mt-2 space-y-1.5 rounded-lg border border-red-200 bg-red-50/60 p-2 dark:border-red-500/30 dark:bg-red-500/5">
                            {m.note && <p className="text-xs font-medium text-red-700 dark:text-red-300">{m.note}</p>}
                            {m.checks.length > 0 && <div className="flex flex-wrap gap-1.5">{m.checks.map((c, i) => (
                                <button key={i} type="button" title={c.staffId ? (c.canToggle ? tr("Asked of you: confirm it") : tr("Only {name} can confirm this", { name: c.person || '' })) : undefined} disabled={!c.canToggle || toggling} onClick={() => toggle(m, i)} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition ${c.done ? 'bg-emerald-100 text-emerald-700' : c.staffId ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} ${c.canToggle ? '' : 'cursor-default'}`}>{c.done ? <TbSquareCheck /> : <TbSquare />}{c.staffId && <><TbAt /><b>{c.person}</b></>}{c.text}</button>
                            ))}</div>}
                        </div>
                    )}
                    {m.direction === 'draft' && m.canSend && (() => { const left = m.checks.filter((c) => !c.done).length; return <div className="mt-2 flex items-center gap-2"><Button size="sm" variant="solid" icon={<TbSend />} disabled={left > 0} onClick={() => setSend(m)}>{tr("Send now")}</Button>{left > 0 && <span className="text-xs text-red-600">{tr("Confirm the red checks first")} ({left})</span>}</div> })()}
                    <CommentFoot
                        remind={{ relType: kind === 'client' ? 'customer' : 'lead', relId: leadId, tab: kind === 'client' ? null : 'mails', note: `${tr('Reply')}: ${m.subject || ''}`.slice(0, 140) }}
                        onMention={(sid) => run(() => api(`${base}/mails/send`, { method: 'POST', body: { action: 'mention', mailId: m.id, staffId: sid } }), tr('Colleague mentioned'), () => {})}
                        onComment={() => { setCommenting(commenting === m.id ? null : m.id); setCommentText('') }}
                        onReply={m.direction !== 'draft' && canEdit ? () => replyTo(m) : null}
                        onEdit={m.canEdit ? () => setForm({ id: m.id, direction: m.direction, date: new Date(m.date), from: m.from, to: m.to, cc: m.cc, bcc: m.bcc, replyTo: m.replyTo, note: m.note, checks: m.checks, scheduledAt: m.scheduledAt ? new Date(m.scheduledAt) : null, subject: m.subject, body: m.body }) : null}
                        onDelete={m.canDelete && (allowDelete || m.direction === 'draft') ? () => setDel(m) : null}
                    />
                    {(m.comments || []).length > 0 && (
                        <div className="mt-2 space-y-1.5 border-l-2 border-primary/30 pl-3">
                            {m.comments.map((c) => (
                                <div key={c.id} className="text-xs"><span className="font-semibold">{c.by?.name || tr('Unknown')}</span><span className="ms-2 text-gray-400">{dayjs(c.date).format('DD MMM, HH:mm')}</span><div className="mt-0.5 text-sm"><RichView html={c.content} /></div></div>
                            ))}
                        </div>
                    )}
                    {commenting === m.id && (
                        <div className="mt-2 space-y-2">
                            <RichEditor minHeight={70} images={false} placeholder={tr("Write a comment on this mail (only the team reads it)")} value={commentText} onChange={setCommentText} />
                            <div className="flex justify-end gap-2"><Button size="xs" onClick={() => setCommenting(null)}>{tr("Cancel")}</Button><Button size="xs" variant="solid" disabled={!commentText.trim()} onClick={() => run(() => api(`${base}/mails/send`, { method: 'POST', body: { action: 'comment', mailId: m.id, content: commentText } }).then(() => { setCommenting(null); setCommentText('') }), tr("Comment added"))}>{tr("Comment")}</Button></div>
                        </div>
                    )}
                </div>
            ))}
            {!mails.length && !form && <p className="text-sm text-gray-500">{filtering ? tr("No mail matches these filters.") : tr("No mails logged yet.")}</p>}
            <ConfirmDialog isOpen={!!send} type="info" title={tr("Send this draft now?")} confirmText={tr("Send")} onClose={() => setSend(null)} onCancel={() => setSend(null)} onConfirm={() => { const m = send; setSend(null); run(() => api(`${base}/mails/send`, { method: 'POST', body: { mailId: m.id } }).then(() => setForm(null)), tr("Mail sent")) }}>
                <p>{send?.subject}</p><p className="text-sm text-gray-500">{tr("To")} {send?.to}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this mail?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const m = del; setDel(null); run(() => api(`${base}/mails?mailId=${m.id}`, { method: 'DELETE' }), tr("Mail deleted")) }}>
                <p>{del?.subject}</p>
            </ConfirmDialog>
        </div>
    )
}

const REMIND = [['', tr("No reminder")], ['10:minutes', tr("10 minutes before")], ['30:minutes', tr("30 minutes before")], ['1:hours', tr("1 hour before")], ['1:days', tr("1 day before")]]
const MEET_EMPTY = () => { const s = dayjs().add(1, 'hour').startOf('hour'); return { title: '', start: s.toDate(), end: s.add(1, 'hour').toDate(), link: '', location: '', reminder: '30:minutes', attendeeIds: [], report: '' } }

/** Meetings with the lead: a calendar event (so it shows in the Calendar, with its reminder) plus the meeting report. */
export const LeadMeetings = ({ leadId, leadName, meetings, staff, canEdit, run }) => {
    const nav = useNavigate()
    const [form, setForm] = useState(null)
    const [del, setDel] = useState(null)
    const set = (p) => setForm((f) => ({ ...f, ...p }))
    const opts = staff.map((s) => ({ value: s.id, label: s.name }))
    const save = () => {
        const [n, unit] = (form.reminder || '').split(':')
        const body = { eventId: form.id, title: form.title || `${tr("Meeting")} · ${leadName}`, start: new Date(form.start).toISOString(), end: form.end ? new Date(form.end).toISOString() : null, meetingUrl: form.link, location: form.location, attendeeIds: form.attendeeIds, report: form.report, reminderBefore: n === '' || n === undefined ? null : Number(n), reminderBeforeType: unit || 'minutes' }
        return run(() => api(`/api/crm/pipeline/leads/${leadId}/meetings`, { method: form.id ? 'PUT' : 'POST', body }).then(() => setForm(null)), tr("Meeting saved"))
    }
    const edit = (m) => setForm({ id: m.id, title: m.title, start: new Date(m.start), end: m.end ? new Date(m.end) : null, link: m.link, location: m.location, reminder: m.reminderBefore == null ? '' : `${m.reminderBefore}:${m.reminderBeforeType}`, attendeeIds: m.attendeeIds, report: m.report })
    const now = Date.now()
    const upcoming = meetings.filter((m) => +new Date(m.start) >= now).sort((a, b) => +new Date(a.start) - +new Date(b.start)), past = meetings.filter((m) => +new Date(m.start) < now)
    const item = (m) => {
        const r = REMIND.find(([v]) => v === (m.reminderBefore == null ? '' : `${m.reminderBefore}:${m.reminderBeforeType}`))
        return (
            <div key={m.id} className={card}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="font-semibold heading-text">{m.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1"><TbCalendarEvent />{m.allDay ? dayjs(m.start).format('DD MMM YYYY') : `${when(m.start)}${m.end ? ` → ${dayjs(m.end).format(dayjs(m.end).isSame(m.start, 'day') ? 'HH:mm' : 'DD MMM HH:mm')}` : ''}`}</span>
                            {m.link && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={m.link} target="_blank" rel="noreferrer"><TbVideo />{tr("Join")}</a>}
                            {m.location && <span className="inline-flex items-center gap-1"><TbMapPin />{m.location}</span>}
                            {m.reminderBefore != null && r && <span className="inline-flex items-center gap-1"><TbBell />{r[1]}</span>}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2"><People list={m.attendees || []} max={3} size={24} />{!m.report && +new Date(m.start) < now && <Tag className="bg-amber-100 text-amber-700">{tr("No report yet")}</Tag>}</div>
                </div>
                {m.report && <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-600"><div className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">{tr("Meeting report")}</div><RichView html={m.report} /></div>}
                <div className="mt-2 flex items-center gap-1">
                    <Button size="xs" variant="plain" icon={<TbCalendarEvent />} data-href={'/calendar'} onClick={() => nav('/calendar')}>{tr("Calendar")}</Button>
                    {m.canEdit && (canEdit || !m.mine) && <Button size="xs" variant="plain" icon={<TbPencil />} onClick={() => edit(m)}>{m.report ? tr("Edit") : tr("Write the report")}</Button>}{m.canDelete && <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} aria-label={tr("Delete")} onClick={() => setDel(m)} />}
                </div>
            </div>
        )
    }
    return (
        <div className="space-y-4">
            {canEdit && !form && <Button size="sm" icon={<TbPlus />} onClick={() => setForm(MEET_EMPTY())}>{tr("New meeting")}</Button>}
            {form && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <div><L>{tr("Title")}</L><Input size="sm" value={form.title} placeholder={`${tr("Meeting")} · ${leadName}`} onChange={(e) => set({ title: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><L>{tr("Starts")}</L><DatePicker.DateTimepicker value={form.start} onChange={(d) => set({ start: d || new Date() })} /></div>
                        <div><L>{tr("Ends")}</L><DatePicker.DateTimepicker value={form.end} onChange={(d) => set({ end: d })} /></div>
                        <div><L>{tr("Meeting link")}</L><Input size="sm" value={form.link} placeholder="https://meet.google.com/… or Zoom, Teams" onChange={(e) => set({ link: e.target.value })} /></div>
                        <div><L>{tr("Place")}</L><Input size="sm" value={form.location} onChange={(e) => set({ location: e.target.value })} /></div>
                        <div><L>{tr("Reminder")}</L><Select size="sm" isSearchable={false} options={REMIND.map(([value, label]) => ({ value, label }))} value={REMIND.filter(([v]) => v === form.reminder).map(([value, label]) => ({ value, label }))[0]} onChange={(o) => set({ reminder: o.value })} /></div>
                        <div><L>{tr("Who joins")}</L><Select size="sm" isMulti options={opts} value={opts.filter((o) => form.attendeeIds.includes(o.value))} onChange={(o) => set({ attendeeIds: (o || []).map((x) => x.value) })} /></div>
                    </div>
                    <div><L>{tr("Meeting report")}</L><RichEditor minHeight={120} value={form.report} placeholder={tr("What was said and decided, and what happens next")} onChange={(html) => set({ report: html })} /></div>
                    <p className="text-xs text-gray-500">{tr("The meeting is added to the Calendar, with its reminder.")}</p>
                    <div className="flex gap-2"><Button size="sm" variant="solid" onClick={save}>{tr("Save meeting")}</Button><Button size="sm" onClick={() => setForm(null)}>{tr("Cancel")}</Button></div>
                </div>
            )}
            {upcoming.length > 0 && <div className="space-y-2"><h6 className="text-gray-400">{tr("Upcoming")}</h6>{upcoming.map(item)}</div>}
            {past.length > 0 && <div className="space-y-2"><h6 className="text-gray-400">{tr("Past")}</h6>{past.map(item)}</div>}
            {!meetings.length && !form && <p className="text-sm text-gray-500">{tr("No meetings yet.")}</p>}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this meeting?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const m = del; setDel(null); run(() => api(`/api/crm/pipeline/leads/${leadId}/meetings?eventId=${m.id}`, { method: 'DELETE' }), tr("Meeting deleted")) }}>
                <p>{del?.title}</p>
            </ConfirmDialog>
        </div>
    )
}
