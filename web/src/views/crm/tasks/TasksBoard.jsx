import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { TbPlus, TbSearch, TbLayoutKanban, TbList, TbCircleCheck, TbTrash, TbPencil, TbFlag, TbUserPlus, TbCalendarDue } from 'react-icons/tb'
import dayjs from 'dayjs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import cn from '@/utils/classNames'
import Pipeline from '@/components/crm/Pipeline'
import { api, qs, notify } from '../kit/api'
import { STATUS, PRIORITY, People, fmtDate, isOverdue, prioOf, statusOf } from './shared'
import TaskDrawer from './TaskDrawer'
import { tr, trn } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table

const Plain = ({ children }) => <div>{children}</div>

const TONE = { 1: 'ink', 4: 'butter', 3: 'pine', 2: 'tomato', 5: 'good' }

const TasksBoard = ({ projectId = null }) => {
    const nav = useNavigate()
    const [params, setParams] = useSearchParams()
    const [data, setData] = useState({ list: [], counts: {}, can: {} })
    const [lookups, setLookups] = useState({ staff: [] })
    const [more, setMore] = useState({}) // columns opened beyond the card limit
    const [view, setView] = useState(() => { try { return localStorage.getItem('tasks.view') || 'board' } catch { return 'board' } })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [mine, setMine] = useState(false)
    const [assignee, setAssignee] = useState(null)
    const [priority, setPriority] = useState(null)
    const [done, setDone] = useState(!!projectId)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [del, setDel] = useState(null) // a task about to be deleted
    const [drawer, setDrawer] = useState({ open: false, id: null })

    useEffect(() => { const t = setTimeout(() => setQuery(search), 300); return () => clearTimeout(t) }, [search])
    useEffect(() => { api('/api/crm/work/tasks/lookups').then(setLookups).catch(() => {}) }, [])
    useEffect(() => { const id = params.get('task'); if (id) setDrawer({ open: true, id }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const load = useCallback(async () => {
        try {
            setData(await api(`/api/crm/work/tasks?${qs({ query, mine: mine ? '1' : '', assignee: assignee || '', priority: priority || '', done: done ? '1' : '', ...(projectId ? { relType: 'project', relId: projectId } : {}) })}`))
            setError('')
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, mine, assignee, priority, done, projectId])
    useEffect(() => { load() }, [load])

    const setViewSaved = (v) => { setView(v); try { localStorage.setItem('tasks.view', v) } catch { /* private mode */ } }
    const columns = useMemo(() => {
        const by = Object.fromEntries(STATUS.map((s) => [s.value, []]))
        for (const t of data.list) (by[t.status] ||= []).push(t)
        return by
    }, [data.list])
    const shownStatuses = done ? STATUS : STATUS.filter((s) => s.value !== 5 || (columns[5] || []).length)

    const onDragEnd = async ({ source, destination, draggableId }) => {
        if (!destination || !data.can.edit) return
        const from = +source.droppableId, to = +destination.droppableId
        if (from === to && source.index === destination.index) return
        const next = Object.fromEntries(Object.entries(columns).map(([k, v]) => [k, [...v]]))
        const [moved] = next[from].splice(source.index, 1)
        next[to].splice(destination.index, 0, { ...moved, status: to })
        // optimistic: rebuild the flat list from the new columns
        setData((d) => ({ ...d, list: Object.values(next).flat() }))
        try {
            await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: to, ids: next[to].map((t) => t.id) } })
            if (from !== to) await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: from, ids: next[from].map((t) => t.id) } })
            if (to === 5 || from === 5) load()
        } catch (e) { notify('danger', e.message); load() }
        void draggableId
    }

    const moveTo = (item, toId) => {
        const to = +toId, from = Object.keys(columns).find((k) => columns[k].some((t) => t.id === item.id))
        if (from && +from !== to) onDragEnd({ source: { droppableId: String(from), index: columns[from].findIndex((t) => t.id === item.id) }, destination: { droppableId: String(to), index: (columns[to] || []).length } })
    }
    // change one thing of a task from the menu: read it, then save it back with that thing changed
    const patch = async (item, change, ok) => {
        try {
            const d = await api(`/api/crm/work/tasks/${item.id}`), t = d.task
            await api(`/api/crm/work/tasks/${item.id}`, { method: 'PUT', body: { ...t, startDate: t.startDate ? dayjs(t.startDate).format('YYYY-MM-DD') : null, dueDate: t.dueDate ? dayjs(t.dueDate).format('YYYY-MM-DD') : null, assigneeIds: t.assigneeIds, followerIds: t.followerIds, ...change(t) } })
            notify('success', ok); load()
        } catch (e) { notify('danger', e.message) }
    }
    const remove = async (item) => { try { await api(`/api/crm/work/tasks/${item.id}`, { method: 'DELETE' }); notify('success', tr("Task deleted")); load() } catch (e) { notify('danger', e.message) } }
    const open = (id) => (id ? nav(`/crm/tasks/${id}`) : setDrawer({ open: true, id: null }))
    const close = () => { setDrawer((d) => ({ ...d, open: false })); if (params.get('task')) { params.delete('task'); setParams(params, { replace: true }) } }
    const staffOptions = lookups.staff.map((s) => ({ value: s.id, label: s.name }))

    const Wrap = projectId ? Plain : Container
    return (
        <Wrap>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>{projectId ? <h5>{tr("Tasks")}</h5> : <h3>{tr("Tasks")}</h3>}<p className="text-sm text-gray-500">{trn(data.list.length, "task")} {tr("shown")}</p></div>
                <div className="flex items-center gap-2">
                    <Segment value={view} onChange={(v) => setViewSaved(Array.isArray(v) ? v[0] : v)} size="sm">
                        <Segment.Item value="board"><span className="inline-flex items-center gap-1"><TbLayoutKanban />{tr("Board")}</span></Segment.Item>
                        <Segment.Item value="list"><span className="inline-flex items-center gap-1"><TbList />{tr("List")}</span></Segment.Item>
                    </Segment>
                    {data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("New task")}</Button>}
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search tasks")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-48"><Select size="sm" isClearable placeholder={tr("Any assignee")} options={staffOptions} value={staffOptions.find((o) => o.value === assignee) || null} onChange={(o) => { setAssignee(o?.value || null); setMine(false) }} /></div>
                <div className="w-36"><Select size="sm" isClearable placeholder={tr("Any priority")} options={PRIORITY.map((p) => ({ value: p.value, label: p.label }))} value={priority ? { value: priority, label: prioOf(priority).label } : null} onChange={(o) => setPriority(o?.value || null)} /></div>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={mine} onChange={(c) => { setMine(c); if (c) setAssignee(null) }} />{tr("My tasks")}</label>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={done} onChange={setDone} />{tr("Show completed")}</label>
            </div>

            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            {view === 'board' ? (
                <Pipeline
                    loading={loading}
                    canDrag={(t) => !!data.can.edit && t.canFinish !== false}
                    onOpen={(it) => open(it.id)}
                    onMoveTo={data.can.edit ? moveTo : undefined}
                    ends={data.can.edit ? [{ id: 'won', name: tr("Done"), sub: tr("Mark as complete"), icon: <TbCircleCheck /> }, ...(data.can.delete ? [{ id: 'lost', name: tr("Delete"), sub: tr("Remove the task"), icon: <TbTrash />, tone: 'lost' }] : [])] : []}
                    actions={(it) => [
                        ...(data.can.edit ? [
                            { label: tr("Mark complete"), icon: <TbCircleCheck />, onClick: () => moveTo(it, 5) },
                            { label: tr("Priority"), icon: <TbFlag />, sub: PRIORITY.map((p) => ({ label: p.label, checked: it.priority === p.value, color: ['#9ca3af', '#3b82f6', '#f97316', '#ef4444'][p.value - 1], onClick: () => patch(it, () => ({ priority: p.value }), tr("Priority changed")) })) },
                            { label: tr("Due date"), icon: <TbCalendarDue />, sub: [[tr("Today"), 0], [tr("Tomorrow"), 1], [tr("In a week"), 7], [tr("In a month"), 30]].map(([label, n]) => ({ label, onClick: () => patch(it, () => ({ dueDate: dayjs().add(n, 'day').format('YYYY-MM-DD') }), tr("Due date changed")) })).concat([{ label: tr("No due date"), onClick: () => patch(it, () => ({ dueDate: null }), tr("Due date changed")) }]) },
                            { label: tr("Assign to"), icon: <TbUserPlus />, sub: lookups.staff.map((m) => ({ label: m.name, checked: it.team?.some((x) => x.id === m.id), onClick: () => patch(it, (t) => ({ assigneeIds: t.assigneeIds.includes(m.id) ? t.assigneeIds.filter((x) => x !== m.id) : [...t.assigneeIds, m.id] }), tr("Team changed")) })) },
                            { label: tr("Edit"), icon: <TbPencil />, onClick: () => setDrawer({ open: true, id: it.id }) },
                        ] : []),
                        ...(data.can.delete ? [{ label: tr("Delete"), icon: <TbTrash />, danger: true, after: true, onClick: () => setDel(it) }] : []),
                    ]}
                    onMove={({ item, from, to, index, fromIndex }) => {
                        if (String(to).startsWith('end:')) return String(to) === 'end:won' ? moveTo(item, 5) : setDel(item)
                        onDragEnd({ source: { droppableId: from, index: fromIndex }, destination: { droppableId: to, index } })
                    }}
                    columns={shownStatuses.map((s) => {
                        const all = columns[s.value] || []
                        const limit = lookups.defaults?.kanbanLimit > 0 && !more[s.value] ? lookups.defaults.kanbanLimit : undefined
                        return {
                            id: s.value, name: s.label, tone: TONE[s.value], count: all.length,
                            items: all.slice(0, limit).map((t) => ({ id: t.id, canFinish: t.canFinish, title: t.name, sub: t.rel?.label, date: fmtDate(t.dueDate), overdue: isOverdue(t), label: prioOf(t.priority).label, priority: t.priority, badge: t.checklistTotal > 0 ? `${t.checklistDone}/${t.checklistTotal}` : null, kicker: `${tr("Task")}${t.rel?.label ? ` · ${t.rel.label}` : ''}`,
                                fields: [{ label: tr("Priority"), value: prioOf(t.priority).label }, { label: tr("Due"), value: fmtDate(t.dueDate) }, { label: tr("Related to"), value: t.rel?.label }, { label: tr("Checklist"), value: t.checklistTotal > 0 ? `${t.checklistDone}/${t.checklistTotal}` : '' }],
                                team: t.assignees, people: <People list={t.assignees} size={26} /> })),
                            more: limit && all.length > limit ? { left: all.length - limit, onClick: () => setMore((m) => ({ ...m, [s.value]: true })) } : null,
                        }
                    })}
                />
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <Table>
                        <THead><Tr><Th>{tr("Task")}</Th><Th>{tr("Related to")}</Th><Th>{tr("Status")}</Th><Th>{tr("Priority")}</Th><Th>{tr("Assigned")}</Th><Th>{tr("Due")}</Th></Tr></THead>
                        <TBody>
                            {data.list.map((t) => (
                                <Tr key={t.id} className="cursor-pointer" onClick={() => open(t.id)}>
                                    <Td className="font-semibold">{t.name}</Td>
                                    <Td className="text-gray-500">{t.rel?.label || '—'}</Td>
                                    <Td><span className="inline-flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', statusOf(t.status).dot)} />{statusOf(t.status).label}</span></Td>
                                    <Td className={prioOf(t.priority).text}>{prioOf(t.priority).label}</Td>
                                    <Td><People list={t.assignees} /></Td>
                                    <Td className={isOverdue(t) ? 'font-semibold text-red-500' : ''}>{fmtDate(t.dueDate) || '—'}</Td>
                                </Tr>
                            ))}
                            {!loading && !data.list.length && <Tr><Td colSpan={6} className="py-10 text-center text-gray-500">{tr("No tasks match")}</Td></Tr>}
                        </TBody>
                    </Table>
                </div>
            )}

            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this task?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const it = del; setDel(null); remove(it) }}>
                <p>{del?.title}</p>
            </ConfirmDialog>
            <TaskDrawer open={drawer.open} id={drawer.id} staff={lookups.staff} presets={{ ...(lookups.defaults ? { status: lookups.defaults.status, priority: lookups.defaults.priority, billable: lookups.defaults.billable, assigneeIds: lookups.defaults.assignMe && lookups.me ? [lookups.me] : [], followerIds: lookups.defaults.followMe && lookups.me ? [lookups.me] : [] } : {}), ...(projectId ? { relType: 'project', relId: projectId } : {}) }} onClose={close} onChanged={load} />
        </Wrap>
    )
}

export default TasksBoard
