/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { TbPlus, TbTrash, TbPencil, TbVideo, TbMapPin, TbBell, TbCalendarEvent, TbArrowDownLeft, TbArrowUpRight } from 'react-icons/tb'
import dayjs from 'dayjs'
import RichView from '@/components/crm/RichView'
import RichEditor from '@/components/crm/RichEditor'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify, qs, useCan } from '../kit/api'
import ChecklistPanel from '@/components/crm/ChecklistPanel'
import TaskDrawer from '../tasks/TaskDrawer'
import { People, useTaskStatuses } from '../tasks/shared'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const card = 'group relative rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50'
const when = (d) => dayjs(d).format('DD MMM YYYY, HH:mm')

/**
 * The tasks of the lead, right in its popup, with the same panel as a task's checklist: tick, rename in place, a date, one or several
 * people, delete; "@" and "#" work in the name. The arrow opens the full task popup. Every task created here is linked to the lead.
 */
export const LeadTasks = ({ leadId, staff, onChanged }) => {
    useTaskStatuses()
    const can = useCan()
    const [list, setList] = useState(null)
    const [popup, setPopup] = useState({ open: false, id: null, k: 0 })
    const live = useRef({}) // the people of each task as the person sees them now, so two quick clicks never overwrite each other
    const queue = useRef(Promise.resolve())
    const load = useCallback(async () => {
        try { setList((await api(`/api/crm/work/tasks?${qs({ relType: 'lead', relId: leadId, done: '1' })}`)).list || []) } catch (e) { notify('danger', e.message); setList([]) }
    }, [leadId])
    useEffect(() => { load() }, [load])
    const items = useMemo(() => (list || []).map((t) => ({ id: t.id, description: t.name, finished: t.status === 5, dueDate: t.dueDate, assignedIds: (t.assignees || []).map((x) => x.id), canFinish: t.canFinish })), [list])
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
        try {
            if (op.action === 'add') await api('/api/crm/work/tasks', { method: 'POST', body: { name: op.description, relType: 'lead', relId: leadId, dueDate: op.dueDate || null, assigneeIds: op.assignedIds || [] } })
            else if (op.action === 'toggle') await api(`/api/crm/work/tasks/${op.itemId}/move`, { method: 'POST', body: { status: op.finished ? 5 : 1 } })
            else if (op.action === 'delete') await api(`/api/crm/work/tasks/${op.itemId}`, { method: 'DELETE' })
            else if (op.action === 'update') {
                const change = {}
                if (op.description !== undefined) change.name = op.description
                if (op.dueDate !== undefined) change.dueDate = op.dueDate ? dayjs(op.dueDate).format('YYYY-MM-DD') : null
                if (op.assignedIds) { live.current[op.itemId] = op.assignedIds; change.assigneeIds = op.assignedIds }
                if (op.toggleAssignee) { const cur = live.current[op.itemId] || []; const next = cur.includes(op.toggleAssignee) ? cur.filter((x) => x !== op.toggleAssignee) : [...cur, op.toggleAssignee]; live.current[op.itemId] = next; change.assigneeIds = next }
                await patch(op.itemId, change)
            } else return
            await changed()
        } catch (e) { notify('danger', e.message); await load() }
    }
    return (
        <div className="space-y-3">
            {list === null ? <p className="text-sm text-gray-500">{tr("Loading…")}</p> : (
                <ChecklistPanel title={tr("Tasks")} items={items} staff={staff} canEdit={can('tasks', 'edit') && can('tasks', 'create')} canDelete={can('tasks', 'delete')} reminders={false} sortable={false}
                    placeholder={tr("Add a task for this lead (@ to mention, # for a tag)")} empty={tr("No tasks for this lead yet.")} act={act} onOpen={(i) => setPopup({ open: true, id: i.id, k: popup.k + 1 })} />
            )}
            {can('tasks', 'create') && <Button size="sm" icon={<TbPlus />} onClick={() => setPopup({ open: true, id: null, k: popup.k + 1 })}>{tr("New task with all its details")}</Button>}
            <TaskDrawer open={popup.open} id={popup.id} staff={staff} refreshKey={popup.k} presets={{ relType: 'lead', relId: leadId }} onClose={() => setPopup((p) => ({ ...p, open: false }))} onChanged={changed} />
        </div>
    )
}

const MAIL_EMPTY = () => ({ direction: 'in', date: new Date(), from: '', to: '', subject: '', body: '' })

/** Emails sent to or received from the lead, written in the editor with their date and time. Mails read by the lead mailbox land here too. */
export const LeadMails = ({ leadId, mails, canEdit, run }) => {
    const [form, setForm] = useState(null) // { id?, ...fields }
    const [del, setDel] = useState(null)
    const set = (p) => setForm((f) => ({ ...f, ...p }))
    const save = () => run(() => api(`/api/crm/pipeline/leads/${leadId}/mails`, { method: form.id ? 'PUT' : 'POST', body: { ...form, mailId: form.id, date: new Date(form.date).toISOString() } }).then(() => setForm(null)), tr("Mail saved"))
    return (
        <div className="space-y-4">
            {canEdit && !form && <Button size="sm" icon={<TbPlus />} onClick={() => setForm(MAIL_EMPTY())}>{tr("Log a mail")}</Button>}
            {form && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-3">
                        <div><L>{tr("Type")}</L><Segment size="sm" value={form.direction} onChange={(v) => set({ direction: Array.isArray(v) ? v[0] : v })}><Segment.Item value="in">{tr("Received")}</Segment.Item><Segment.Item value="out">{tr("Sent")}</Segment.Item></Segment></div>
                        <div><L>{tr("Date and time")}</L><DatePicker.DateTimepicker value={form.date} onChange={(d) => set({ date: d || new Date() })} /></div>
                        <div><L>{tr("From")}</L><Input size="sm" value={form.from} placeholder="name@company.com" onChange={(e) => set({ from: e.target.value })} /></div>
                        <div><L>{tr("To")}</L><Input size="sm" value={form.to} placeholder="name@company.com" onChange={(e) => set({ to: e.target.value })} /></div>
                    </div>
                    <div><L>{tr("Subject")}</L><Input size="sm" value={form.subject} onChange={(e) => set({ subject: e.target.value })} /></div>
                    <div><L>{tr("Mail")}</L><RichEditor minHeight={140} value={form.body} placeholder={tr("Paste or write the mail here")} onChange={(html) => set({ body: html })} /></div>
                    <div className="flex gap-2"><Button size="sm" variant="solid" onClick={save}>{tr("Save mail")}</Button><Button size="sm" onClick={() => setForm(null)}>{tr("Cancel")}</Button></div>
                </div>
            )}
            {mails.map((m) => (
                <div key={m.id} className={card}>
                    <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2"><Tag className={m.direction === 'out' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}>{m.direction === 'out' ? <TbArrowUpRight className="inline" /> : <TbArrowDownLeft className="inline" />} {m.direction === 'out' ? tr("Sent") : tr("Received")}</Tag><span className="truncate font-semibold heading-text">{m.subject || tr("(no subject)")}</span></div>
                            <div className="mt-0.5 text-xs text-gray-500">{[m.from && `${tr("From")} ${m.from}`, m.to && `${tr("To")} ${m.to}`].filter(Boolean).join(' · ')}</div>
                        </div>
                        <div className="shrink-0 text-end text-xs text-gray-500"><div>{when(m.date)}</div>{m.source === 'mailbox' && <div className="text-[11px]">{tr("from the mailbox")}</div>}</div>
                    </div>
                    {m.body && <div className="max-h-56 overflow-auto"><RichView html={m.body} /></div>}
                    {canEdit && (
                        <div className="absolute end-2 bottom-2 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                            <Button size="xs" variant="plain" icon={<TbPencil />} aria-label={tr("Edit")} onClick={() => setForm({ id: m.id, direction: m.direction, date: new Date(m.date), from: m.from, to: m.to, subject: m.subject, body: m.body })} />
                            <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} aria-label={tr("Delete")} onClick={() => setDel(m)} />
                        </div>
                    )}
                </div>
            ))}
            {!mails.length && !form && <p className="text-sm text-gray-500">{tr("No mails logged yet.")}</p>}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this mail?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const m = del; setDel(null); run(() => api(`/api/crm/pipeline/leads/${leadId}/mails?mailId=${m.id}`, { method: 'DELETE' }), tr("Mail deleted")) }}>
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
                    <Button size="xs" variant="plain" icon={<TbCalendarEvent />} onClick={() => nav('/calendar')}>{tr("Calendar")}</Button>
                    {canEdit && <><Button size="xs" variant="plain" icon={<TbPencil />} onClick={() => edit(m)}>{m.report ? tr("Edit") : tr("Write the report")}</Button><Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} aria-label={tr("Delete")} onClick={() => setDel(m)} /></>}
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
