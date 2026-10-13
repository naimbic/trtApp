import { useCallback, useEffect, useRef, useState } from 'react'
import { TbPlayerPlay, TbPlayerStop, TbTrash, TbPlus } from 'react-icons/tb'
import Drawer from '@/components/ui/Drawer'
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
import { STATUS, PRIORITY, REL_TYPES, People, duration, initials } from './shared'
import Avatar from '@/components/ui/Avatar'

const EMPTY = { name: '', description: '', status: 1, priority: 2, startDate: null, dueDate: null, relType: null, relId: null, assigneeIds: [], followerIds: [], billable: false, isPublic: false, visibleToClient: false, hourlyRate: 0, recurring: false, recurringType: 'month', repeatEvery: 1, totalCycles: 0 }
const toDate = (d) => (d ? new Date(d) : null)
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>

const TaskDrawer = ({ open, id, staff, onClose, onChanged }) => {
    const [v, setV] = useState(EMPTY)
    const [detail, setDetail] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirmDel, setConfirmDel] = useState(false)
    const [item, setItem] = useState('')
    const [comment, setComment] = useState('')
    const [tick, setTick] = useState(0)
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

    useEffect(() => { if (!open) return; setDetail(null); setItem(''); setComment(''); if (id) load(); else setV(EMPTY) }, [open, id, load])
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
            notify('success', edit ? 'Task saved' : 'Task created')
            onChanged()
            if (edit) await load(); else onClose()
            void r
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const post = (path, body) => api(`/api/crm/work/tasks/${id}/${path}`, { method: 'POST', body })
    const running = detail?.running
    const runningSecs = running ? Math.max(0, Math.round((Date.now() - +new Date(running.startTime)) / 1000)) : 0
    void tick
    const relResource = REL_TYPES.find((r) => r.value === v.relType)?.resource

    const details = (
        <div className="space-y-4">
            <div><L>Subject</L><Input disabled={!canEdit} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="What needs to be done?" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><L>Status</L><Select isDisabled={!canEdit} options={STATUS.map((s) => ({ value: s.value, label: s.label }))} value={STATUS.filter((s) => s.value === +v.status).map((s) => ({ value: s.value, label: s.label }))[0]} onChange={(o) => set({ status: o.value })} /></div>
                <div><L>Priority</L><Select isDisabled={!canEdit} options={PRIORITY.map((p) => ({ value: p.value, label: p.label }))} value={PRIORITY.filter((p) => p.value === +v.priority).map((p) => ({ value: p.value, label: p.label }))[0]} onChange={(o) => set({ priority: o.value })} /></div>
                <div><L>Start date</L><DatePicker disabled={!canEdit} value={v.startDate} onChange={(d) => set({ startDate: d })} /></div>
                <div><L>Due date</L><DatePicker disabled={!canEdit} value={v.dueDate} onChange={(d) => set({ dueDate: d })} /></div>
            </div>
            <div><L>Assigned to</L><Select isMulti isDisabled={!canEdit} options={staffOptions} value={pick(v.assigneeIds)} onChange={(o) => set({ assigneeIds: (o || []).map((x) => x.value) })} /></div>
            <div><L>Followers</L><Select isMulti isDisabled={!canEdit} options={staffOptions} value={pick(v.followerIds)} onChange={(o) => set({ followerIds: (o || []).map((x) => x.value) })} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><L>Related to</L><Select isClearable isDisabled={!canEdit} options={REL_TYPES.map((r) => ({ value: r.value, label: r.label }))} value={REL_TYPES.filter((r) => r.value === v.relType).map((r) => ({ value: r.value, label: r.label }))[0] || null} onChange={(o) => set({ relType: o?.value || null, relId: null })} /></div>
                <div><L>{REL_TYPES.find((r) => r.value === v.relType)?.label || 'Record'}</L>{relResource ? <RelationSelect key={v.relType} resource={relResource} value={v.relId} disabled={!canEdit} onChange={(x) => set({ relId: x || null })} /> : <Input disabled placeholder="Pick a type first" />}</div>
            </div>
            <div><L>Description</L><Input textArea rows={5} disabled={!canEdit} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
            <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm"><span>Billable</span><Switcher disabled={!canEdit} checked={!!v.billable} onChange={(c) => set({ billable: c })} /></div>
                {v.billable && <div><L>Hourly rate</L><Input type="number" disabled={!canEdit} value={v.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} /></div>}
                <div className="flex items-center justify-between text-sm"><span>Visible to the whole team</span><Switcher disabled={!canEdit} checked={!!v.isPublic} onChange={(c) => set({ isPublic: c })} /></div>
                <div className="flex items-center justify-between text-sm"><span>Visible to the client</span><Switcher disabled={!canEdit} checked={!!v.visibleToClient} onChange={(c) => set({ visibleToClient: c })} /></div>
                <div className="flex items-center justify-between text-sm"><span>Repeat this task</span><Switcher disabled={!canEdit} checked={!!v.recurring} onChange={(c) => set({ recurring: c })} /></div>
                {v.recurring && (
                    <div className="grid grid-cols-3 gap-3">
                        <div><L>Every</L><Input type="number" min={1} disabled={!canEdit} value={v.repeatEvery} onChange={(e) => set({ repeatEvery: e.target.value })} /></div>
                        <div><L>Unit</L><Select isDisabled={!canEdit} options={['day', 'week', 'month', 'year'].map((x) => ({ value: x, label: x }))} value={{ value: v.recurringType, label: v.recurringType }} onChange={(o) => set({ recurringType: o.value })} /></div>
                        <div><L>Cycles (0 = ∞)</L><Input type="number" min={0} disabled={!canEdit} value={v.totalCycles} onChange={(e) => set({ totalCycles: e.target.value })} /></div>
                    </div>
                )}
            </div>
        </div>
    )

    const checklist = detail && (
        <div className="space-y-3">
            {detail.checklist.map((c) => (
                <div key={c.id} className="group flex items-center gap-2">
                    <Checkbox checked={c.finished} onChange={(f) => act(() => post('checklist', { action: 'toggle', itemId: c.id, finished: f }))} />
                    <span className={c.finished ? 'flex-1 text-gray-400 line-through' : 'flex-1'}>{c.description}</span>
                    <Button size="xs" variant="plain" className="opacity-0 group-hover:opacity-100" icon={<TbTrash />} onClick={() => act(() => post('checklist', { action: 'delete', itemId: c.id }))} />
                </div>
            ))}
            {!detail.checklist.length && <p className="text-sm text-gray-500">No checklist yet. Break the task into small steps.</p>}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (item.trim()) act(() => post('checklist', { action: 'add', description: item }).then(() => setItem(''))) }}>
                <Input size="sm" placeholder="Add an item" value={item} onChange={(e) => setItem(e.target.value)} />
                <Button size="sm" type="submit" icon={<TbPlus />}>Add</Button>
            </form>
        </div>
    )

    const comments = detail && (
        <div className="space-y-4">
            {detail.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                    <Avatar size={30} shape="circle" src={c.staff?.image || undefined}>{initials(c.staff?.name || (c.fromClient ? 'Client' : '?'))}</Avatar>
                    <div className="flex-1 rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{c.staff?.name || (c.fromClient ? 'Client' : 'Unknown')}</span><span>{dayjs(c.createdAt).format('DD MMM, HH:mm')}{(c.mine || detail.can.delete) && <button className="ml-2 text-red-500" onClick={() => act(() => api(`/api/crm/work/tasks/${id}/comments?commentId=${c.id}`, { method: 'DELETE' }))}>delete</button>}</span></div>
                        <div className="whitespace-pre-line">{c.content}</div>
                    </div>
                </div>
            ))}
            {!detail.comments.length && <p className="text-sm text-gray-500">No comments yet.</p>}
            <div className="space-y-2">
                <Input textArea rows={3} placeholder="Write a comment" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button size="sm" variant="solid" disabled={!comment.trim()} onClick={() => act(() => post('comments', { content: comment }).then(() => setComment('')))}>Comment</Button>
            </div>
        </div>
    )

    const time = detail && (
        <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div><div className="text-sm text-gray-500">Total tracked</div><div className="text-xl font-bold">{duration(detail.totalSeconds)}</div></div>
                {running
                    ? <Button variant="solid" color="red-500" icon={<TbPlayerStop />} onClick={() => act(() => post('timer', { action: 'stop' }), 'Timer stopped')}>Stop · {duration(runningSecs)}</Button>
                    : <Button variant="solid" icon={<TbPlayerPlay />} onClick={() => act(() => post('timer', { action: 'start' }), 'Timer started')}>Start timer</Button>}
            </div>
            {detail.timers.map((t) => (
                <div key={t.id} className="group flex items-center justify-between text-sm">
                    <div><span className="font-medium">{t.staff?.name || '—'}</span><span className="ml-2 text-gray-500">{dayjs(t.startTime).format('DD MMM, HH:mm')}{t.endTime ? ` → ${dayjs(t.endTime).format('HH:mm')}` : ' · running'}</span></div>
                    <div className="flex items-center gap-2"><span className="font-semibold">{duration(t.seconds)}</span><Button size="xs" variant="plain" className="opacity-0 group-hover:opacity-100" icon={<TbTrash />} onClick={() => act(() => post('timer', { action: 'delete', timerId: t.id }))} /></div>
                </div>
            ))}
            {!detail.timers.length && <p className="text-sm text-gray-500">No time logged yet.</p>}
        </div>
    )

    return (
        <Drawer
            title={edit ? (detail?.task.name || 'Task') : 'New task'}
            isOpen={open}
            onClose={onClose}
            onRequestClose={onClose}
            width={600}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && <Button variant="plain" className="text-red-500" onClick={() => setConfirmDel(true)}>Delete</Button>}
                    <div className="ml-auto flex gap-2">
                        <Button onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>
                        {canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? 'Save changes' : 'Create task'}</Button>}
                    </div>
                </div>
            }
        >
            {edit && !detail ? <div className="py-10 text-center text-gray-500">Loading…</div> : edit ? (
                <>
                    {detail.task.assignees.length > 0 && <div className="mb-3 flex items-center gap-2 text-sm text-gray-500"><People list={detail.task.assignees} max={5} size={28} />{detail.task.rel?.label && <span>· {detail.task.rel.label}</span>}</div>}
                    <Tabs defaultValue="details">
                        <Tabs.TabList>
                            <Tabs.TabNav value="details">Details</Tabs.TabNav>
                            <Tabs.TabNav value="checklist">Checklist{detail.checklist.length ? ` (${detail.checklist.filter((c) => c.finished).length}/${detail.checklist.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="comments">Comments{detail.comments.length ? ` (${detail.comments.length})` : ''}</Tabs.TabNav>
                            <Tabs.TabNav value="time">Time{detail.totalSeconds ? ` · ${duration(detail.totalSeconds)}` : ''}</Tabs.TabNav>
                        </Tabs.TabList>
                        <div className="pt-4">
                            <Tabs.TabContent value="details">{details}</Tabs.TabContent>
                            <Tabs.TabContent value="checklist">{checklist}</Tabs.TabContent>
                            <Tabs.TabContent value="comments">{comments}</Tabs.TabContent>
                            <Tabs.TabContent value="time">{time}</Tabs.TabContent>
                        </div>
                    </Tabs>
                </>
            ) : details}
            <ConfirmDialog isOpen={confirmDel} type="danger" title="Delete this task?" confirmText="Delete" onClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={async () => { setConfirmDel(false); try { await api(`/api/crm/work/tasks/${id}`, { method: 'DELETE' }); notify('success', 'Task deleted'); onChanged(); onClose() } catch (e) { notify('danger', e.message) } }}>
                <p>The task, its checklist, comments and time entries are removed for good.</p>
            </ConfirmDialog>
        </Drawer>
    )
}

export default TaskDrawer
