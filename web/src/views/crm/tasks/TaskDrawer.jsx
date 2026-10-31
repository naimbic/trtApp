import { useCallback, useEffect, useRef, useState } from 'react'
import ChecklistPanel from '@/components/crm/ChecklistPanel'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import RichView from '@/components/crm/RichView'
import RichEditor from '@/components/crm/RichEditor'
import { plainOf } from '@/components/crm/ShareButton'
import { CommentTools, CommentEdit, ReplyQuote, ReplyingTo } from '@/components/crm/CommentParts'
import StaffRing from '@/components/crm/StaffRing'
import { TbPlayerPlay, TbPlayerStop, TbTrash, TbPlus, TbChecks, TbListDetails, TbUsers, TbLink, TbFileText, TbSettings } from 'react-icons/tb'
import Drawer from '@/components/crm/PopupFrame'
import FoldSection from '@/components/crm/FoldSection'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import DatePicker from '@/components/ui/DatePicker'
import Tabs from '@/components/ui/Tabs'
import Checkbox from '@/components/ui/Checkbox'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import dayjs from 'dayjs'
import { api, notify } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { STATUS, PRIORITY, REL_TYPES, People, duration, initials, useTaskStatuses } from './shared'
import Avatar from '@/components/ui/Avatar'
import { tr } from '@/utils/t'

const EMPTY = { name: '', description: '', status: 1, priority: 2, startDate: null, dueDate: null, relType: null, relId: null, assigneeIds: [], followerIds: [], billable: false, isPublic: false, visibleToClient: false, hourlyRate: 0, recurring: false, recurringType: 'month', repeatEvery: 1, totalCycles: 0 }
const toDate = (d) => (d ? new Date(d) : null)
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">{children}</label>
const SW = ({ label, children }) => <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm dark:bg-gray-700/30"><span>{label}</span>{children}</div>

const TaskDrawer = ({ open, id, staff, presets, stage, refreshKey, onClose, onChanged }) => {
    useTaskStatuses()
    const [v, setV] = useState(EMPTY)
    const [detail, setDetail] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirmDel, setConfirmDel] = useState(false)
    const [item, setItem] = useState('')
    const [comment, setComment] = useState('')
    const [replyTo, setReplyTo] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [tick, setTick] = useState(0)
    const [openSec, setOpenSec] = useState(['main', 'people'])
    const toggleSec = (k) => setOpenSec((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))
    const ALL_SEC = ['main', 'people', 'link', 'about', 'options']
    const edit = !!id
    const canEdit = edit ? detail?.can.edit : true
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const staffOptions = staff.map((s) => ({ value: s.id, label: s.name }))
    const pick = (ids) => staffOptions.filter((o) => ids.includes(o.value))

    const load = useCallback(async () => {
        if (!id) return
        try {
            const d = await api(`/api/crm/work/tasks/${id}`)
            setDetail(d)
            const t = d.task
            setV({ ...EMPTY, ...t, description: t.description || '', startDate: toDate(t.startDate), dueDate: toDate(t.dueDate), assigneeIds: t.assigneeIds, followerIds: t.followerIds })
        } catch (e) { notify('danger', e.message); onClose() }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { if (!open) return; setDetail(null); setItem(''); setComment(''); setReplyTo(null); setEditingId(null); if (id) load(); else setV({ ...EMPTY, ...(presets || {}) }) }, [open, id, load, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps
    // live clock while a timer is running
    useEffect(() => { if (!detail?.running) return; const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t) }, [detail?.running])
    const mounted = useRef(true)
    useEffect(() => () => { mounted.current = false }, [])

    const act = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); await load(); onChanged() } catch (e) { notify('danger', e.message) } }
    const save = async () => {
        setSaving(true)
        try {
            const body = { ...v, startDate: v.startDate ? dayjs(v.startDate).format('YYYY-MM-DD') : null, dueDate: v.dueDate ? dayjs(v.dueDate).format('YYYY-MM-DD') : null }
            const r = await api(edit ? `/api/crm/work/tasks/${id}` : '/api/crm/work/tasks', { method: edit ? 'PUT' : 'POST', body })
            notify('success', edit ? tr("Task saved") : tr("Task created"))
            onChanged()
            onClose()
            void r
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    // someone set the task to "Awaiting feedback" and it is mine: one click completes it
    const complete = async () => {
        setSaving(true)
        try {
            const body = { ...v, status: 5, startDate: v.startDate ? dayjs(v.startDate).format('YYYY-MM-DD') : null, dueDate: v.dueDate ? dayjs(v.dueDate).format('YYYY-MM-DD') : null }
            await api(`/api/crm/work/tasks/${id}`, { method: 'PUT', body })
            notify('success', tr("Task completed")); onChanged(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const awaitingMe = edit && !!detail?.task.assignedToMe && detail.task.status === 2 && detail.task.canFinish !== false
    const post = (path, body) => api(`/api/crm/work/tasks/${id}/${path}`, { method: 'POST', body })
    const running = detail?.running
    const runningSecs = running ? Math.max(0, Math.round((Date.now() - +new Date(running.startTime)) / 1000)) : 0
    void tick
    const relResource = REL_TYPES.find((r) => r.value === v.relType)?.resource

    const sz = 'sm'
    const statusLabel = STATUS.find((x) => x.value === +v.status)?.label
    const priorityLabel = PRIORITY.find((x) => x.value === +v.priority)?.label
    const names = (ids) => staff.filter((x) => (ids || []).includes(x.id)).map((x) => x.name).join(', ')
    const relLabel = REL_TYPES.find((r) => r.value === v.relType)?.label
    const flags = [v.billable && tr("Billable"), v.isPublic && tr("Team"), v.visibleToClient && tr("Client"), v.recurring && tr("Repeats")].filter(Boolean).join(' · ')

    const details = (
        <div className="space-y-2.5">
            <div className="flex justify-end text-xs"><button type="button" className="text-primary hover:underline" onClick={() => setOpenSec(openSec.length === ALL_SEC.length ? [] : ALL_SEC)}>{openSec.length === ALL_SEC.length ? tr("Collapse all") : tr("Expand all")}</button></div>
            <FoldSection icon={<TbListDetails />} tone="blue" title={tr("Task")} open={openSec.includes('main')} onToggle={() => toggleSec('main')} summary={[v.name, statusLabel, priorityLabel, v.dueDate && dayjs(v.dueDate).format('DD MMM')].filter(Boolean).join(' · ')}>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><L>{tr("Subject")}</L><Input size={sz} disabled={!canEdit} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder={tr("What needs to be done?")} /></div>
                    <div><L>{tr("Status")}</L><Select size={sz} isDisabled={!canEdit || (edit && detail?.task?.canFinish === false)} options={STATUS.filter((s) => s.active || s.value === +v.status).map((s) => ({ value: s.value, label: s.label }))} value={STATUS.filter((s) => s.value === +v.status).map((s) => ({ value: s.value, label: s.label }))[0]} onChange={(o) => set({ status: o.value })} /></div>
                    <div><L>{tr("Priority")}</L><Select size={sz} isDisabled={!canEdit} options={PRIORITY.map((p) => ({ value: p.value, label: p.label }))} value={PRIORITY.filter((p) => p.value === +v.priority).map((p) => ({ value: p.value, label: p.label }))[0]} onChange={(o) => set({ priority: o.value })} /></div>
                    <div><L>{tr("Start date")}</L><DatePicker size={sz} disabled={!canEdit} value={v.startDate} onChange={(d) => set({ startDate: d })} /></div>
                    <div><L>{tr("Due date")}</L><DatePicker size={sz} disabled={!canEdit} value={v.dueDate} onChange={(d) => set({ dueDate: d })} /></div>
                </div>
            </FoldSection>
            <FoldSection icon={<TbUsers />} tone="emerald" title={tr("People")} open={openSec.includes('people')} onToggle={() => toggleSec('people')} summary={[names(v.assigneeIds), v.followerIds?.length ? `+${v.followerIds.length} ${tr("Followers").toLowerCase()}` : ''].filter(Boolean).join(' · ')}>
                <div className="grid grid-cols-2 gap-3">
                    <div><L>{tr("Assigned to")}</L><Select size={sz} isMulti isDisabled={!canEdit} options={staffOptions} value={pick(v.assigneeIds)} onChange={(o) => set({ assigneeIds: (o || []).map((x) => x.value) })} /></div>
                    <div><L>{tr("Followers")}</L><Select size={sz} isMulti isDisabled={!canEdit} options={staffOptions} value={pick(v.followerIds)} onChange={(o) => set({ followerIds: (o || []).map((x) => x.value) })} /></div>
                </div>
            </FoldSection>
            <FoldSection icon={<TbLink />} tone="amber" title={tr("Related to")} open={openSec.includes('link')} onToggle={() => toggleSec('link')} summary={relLabel || ''}>
                <div className="grid grid-cols-2 gap-3">
                    <div><L>{tr("Related to")}</L><Select size={sz} isClearable isDisabled={!canEdit} options={REL_TYPES.map((r) => ({ value: r.value, label: r.label }))} value={REL_TYPES.filter((r) => r.value === v.relType).map((r) => ({ value: r.value, label: r.label }))[0] || null} onChange={(o) => set({ relType: o?.value || null, relId: null })} /></div>
                    <div><L>{relLabel || tr("Record")}</L>{relResource ? <RelationSelect key={v.relType} resource={relResource} value={v.relId} disabled={!canEdit} onChange={(x) => set({ relId: x || null })} /> : <Input size={sz} disabled placeholder={tr("Pick a type first")} />}</div>
                </div>
            </FoldSection>
            <FoldSection icon={<TbFileText />} tone="violet" title={tr("Description")} open={openSec.includes('about')} onToggle={() => toggleSec('about')} summary={plainOf(v.description || '').replace(/\s+/g, ' ').slice(0, 140)}>
                <RichEditor minHeight={110} disabled={!canEdit} value={v.description} onChange={(html) => set({ description: html })} />
            </FoldSection>
            <FoldSection icon={<TbSettings />} tone="rose" title={tr("Billing and options")} open={openSec.includes('options')} onToggle={() => toggleSec('options')} summary={flags}>
                <div className="grid grid-cols-2 gap-2">
                    <SW label={tr("Billable")}><Switcher disabled={!canEdit} checked={!!v.billable} onChange={(c) => set({ billable: c })} /></SW>
                    <SW label={tr("Repeat this task")}><Switcher disabled={!canEdit} checked={!!v.recurring} onChange={(c) => set({ recurring: c })} /></SW>
                    <SW label={tr("Visible to the whole team")}><Switcher disabled={!canEdit} checked={!!v.isPublic} onChange={(c) => set({ isPublic: c })} /></SW>
                    <SW label={tr("Visible to the client")}><Switcher disabled={!canEdit} checked={!!v.visibleToClient} onChange={(c) => set({ visibleToClient: c })} /></SW>
                    {v.billable && <div className="col-span-2"><L>{tr("Hourly rate")}</L><Input size={sz} type="number" disabled={!canEdit} value={v.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} /></div>}
                    {v.recurring && (
                        <div className="col-span-2 grid grid-cols-3 gap-3">
                            <div><L>{tr("Every")}</L><Input size={sz} type="number" min={1} disabled={!canEdit} value={v.repeatEvery} onChange={(e) => set({ repeatEvery: e.target.value })} /></div>
                            <div><L>{tr("Unit")}</L><Select size={sz} isDisabled={!canEdit} options={['day', 'week', 'month', 'year'].map((x) => ({ value: x, label: x }))} value={{ value: v.recurringType, label: v.recurringType }} onChange={(o) => set({ recurringType: o.value })} /></div>
                            <div><L>{tr("Cycles (0 = ∞)")}</L><Input size={sz} type="number" min={0} disabled={!canEdit} value={v.totalCycles} onChange={(e) => set({ totalCycles: e.target.value })} /></div>
                        </div>
                    )}
                </div>
            </FoldSection>
        </div>
    )

    const checklist = detail && (
        <ChecklistPanel items={detail.checklist} staff={staff} canEdit={!!canEdit} act={(op) => act(() => post('checklist', op))} />
    )


    const comments = detail && (
        <div className="space-y-4">
            {detail.comments.map((c) => (
                <div key={c.id} className="group relative flex gap-3">
                    <StaffRing id={c.staff?.id} name={c.staff?.name} size={30}><Avatar size={30} shape="circle" src={c.staff?.image || undefined}>{initials(c.staff?.name || (c.fromClient ? tr("Client") : '?'))}</Avatar></StaffRing>
                    <div className="min-w-0 flex-1 rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{c.staff?.name || (c.fromClient ? tr("Client") : tr("Unknown"))}</span><span>{dayjs(c.createdAt).format('DD MMM, HH:mm')}{c.edited ? ` · ${tr('edited')}` : ''}</span></div>
                        <ReplyQuote r={c.replyTo} />
                        {editingId === c.id
                            ? <CommentEdit initial={c.content} onCancel={() => setEditingId(null)} onSave={async (text) => { await api(`/api/crm/work/tasks/${id}/comments`, { method: 'PUT', body: { commentId: c.id, content: text } }); setEditingId(null); await load() }} />
                            : <RichView html={c.content} />}
                    </div>
                    {editingId !== c.id && <CommentTools share={{ url: `/crm/tasks/${id}`, title: detail?.task.name, text: `${c.staff?.name ? `${c.staff.name}: ` : ''}${plainOf(c.content)}` }} onReply={() => { setReplyTo({ id: c.id, name: c.staff?.name || tr('Client') }); setComment((x) => x || (c.staff?.name ? `@${c.staff.name} ` : '')) }} onEdit={c.mine ? () => setEditingId(c.id) : null} onDelete={c.canDelete ? () => act(() => api(`/api/crm/work/tasks/${id}/comments?commentId=${c.id}`, { method: 'DELETE' })) : null} />}
                </div>
            ))}
            {!detail.comments.length && <p className="text-sm text-gray-500">{tr("No comments yet.")}</p>}
            <div className="space-y-2">
                <ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} />
                <RichEditor minHeight={90} placeholder={tr("Write a comment")} value={comment} onChange={setComment} />
                <Button size="sm" variant="solid" disabled={!comment.trim()} onClick={() => act(() => post('comments', { content: comment, replyToId: replyTo?.id }).then(() => { setComment(''); setReplyTo(null) }))}>{tr("Comment")}</Button>
            </div>
        </div>
    )


    const time = detail && (
        <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div><div className="text-sm text-gray-500">{tr("Total tracked")}</div><div className="text-xl font-bold">{duration(detail.totalSeconds)}</div></div>
                {running
                    ? <Button variant="solid" color="red-500" icon={<TbPlayerStop />} onClick={() => act(() => post('timer', { action: 'stop' }), tr("Timer stopped"))}>{tr("Stop ·")} {duration(runningSecs)}</Button>
                    : <Button variant="solid" icon={<TbPlayerPlay />} onClick={() => act(() => post('timer', { action: 'start' }), tr("Timer started"))}>{tr("Start timer")}</Button>}
            </div>
            {detail.timers.map((t) => (
                <div key={t.id} className="group flex items-center justify-between text-sm">
                    <div><span className="font-medium">{t.staff?.name || '—'}</span><span className="ml-2 text-gray-500">{dayjs(t.startTime).format('DD MMM, HH:mm')}{t.endTime ? ` → ${dayjs(t.endTime).format('HH:mm')}` : tr(" · running")}</span></div>
                    <div className="flex items-center gap-2"><span className="font-semibold">{duration(t.seconds)}</span><Button size="xs" variant="plain" className="opacity-0 group-hover:opacity-100" icon={<TbTrash />} onClick={() => act(() => post('timer', { action: 'delete', timerId: t.id }))} /></div>
                </div>
            ))}
            {!detail.timers.length && <p className="text-sm text-gray-500">{tr("No time logged yet.")}</p>}
        </div>
    )

    return (
        <Drawer
            share={edit ? { url: `/crm/tasks/${id}`, title: detail?.task.name, text: detail?.task.name } : undefined}
            title={edit ? (detail?.task.name || tr("Task")) : tr("New task")}
            kicker={edit ? `${tr("Task")}${detail?.task.rel?.label ? ` · ${detail.task.rel.label}` : ''}` : tr("New task")}
            date={detail?.task.dueDate ? `${tr("Due")} ${dayjs(detail.task.dueDate).format('DD MMM')}` : ''}
            team={detail?.task.assignees?.length ? <People list={detail.task.assignees} max={5} size={30} /> : null}
            stage={stage ? { ...stage, currentId: detail?.task?.status ?? stage.currentId } : stage}
            isOpen={open}
            onClose={onClose}
            width={640}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && <Button variant="plain" className="text-red-500" onClick={() => setConfirmDel(true)}>{tr("Delete")}</Button>}
                    <div className="ml-auto flex gap-2">
                        <Button onClick={onClose}>{canEdit ? tr("Cancel") : tr("Close")}</Button>
                        {awaitingMe && <Button className="!bg-emerald-500 !text-white hover:!bg-emerald-600" icon={<TbChecks />} loading={saving} onClick={complete}>{tr("Mark as complete")}</Button>}
                        {canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? tr("Save changes") : tr("Create task")}</Button>}
                    </div>
                </div>
            }
        >
            {edit && !detail ? <div className="py-10 text-center text-gray-500">{tr("Loading…")}</div> : edit ? (
                <>
                    {awaitingMe && (
                        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm dark:bg-amber-500/10">
                            <span className="min-w-0 flex-1 font-semibold text-amber-800 dark:text-amber-200">{tr("This task is waiting for your feedback.")}</span>
                            <Button size="sm" variant="solid" icon={<TbChecks />} loading={saving} onClick={complete}>{tr("Mark as complete")}</Button>
                        </div>
                    )}
                    {detail.task.assignees.length > 0 && <div className="mb-3 flex items-center gap-2 text-sm text-gray-500"><People list={detail.task.assignees} max={5} size={28} />{detail.task.rel?.label && <span>· {detail.task.rel.label}</span>}</div>}
                    <Tabs defaultValue="details">
                        <Tabs.TabList>
                            <Tabs.TabNav value="details">{tr("Details")}</Tabs.TabNav>
                            <Tabs.TabNav value="checklist">{tr("Checklist")}{detail.checklist.length ? ` (${detail.checklist.filter((c) => c.finished).length}/${detail.checklist.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="comments">{tr("Comments")}{detail.comments.length ? ` (${detail.comments.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="files">{tr("Files")}</Tabs.TabNav>
                            <Tabs.TabNav value="time">{tr("Time")}{detail.totalSeconds ? ` · ${duration(detail.totalSeconds)}` : ''}</Tabs.TabNav>
                        </Tabs.TabList>
                        <div className="pt-4">
                            <Tabs.TabContent value="details">{details}</Tabs.TabContent>
                            <Tabs.TabContent value="checklist">{checklist}</Tabs.TabContent>
                            <Tabs.TabContent value="comments">{comments}</Tabs.TabContent>
                            <Tabs.TabContent value="files"><div className="pt-4"><AttachmentsPanel relType="task" relId={id} canEdit={!!canEdit} /></div></Tabs.TabContent>
                            <Tabs.TabContent value="time">{time}</Tabs.TabContent>
                        </div>
                    </Tabs>
                </>
            ) : details}
            <ConfirmDialog isOpen={confirmDel} type="danger" title={tr("Delete this task?")} confirmText={tr("Delete")} onClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={async () => { setConfirmDel(false); try { await api(`/api/crm/work/tasks/${id}`, { method: 'DELETE' }); notify('success', tr("Task deleted")); onChanged(); onClose() } catch (e) { notify('danger', e.message) } }}>
                <p>{tr("The task, its checklist, comments and time entries are removed for good.")}</p>
            </ConfirmDialog>
        </Drawer>
    )
}

export default TaskDrawer
