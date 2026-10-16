import { useCallback, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { TbPlus, TbSearch, TbChecklist, TbMessage, TbCalendar, TbLayoutKanban, TbList, TbRepeat } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import cn from '@/utils/classNames'
import { api, qs, notify } from '../kit/api'
import { STATUS, PRIORITY, People, fmtDate, isOverdue, prioOf, statusOf } from './shared'
import TaskDrawer from './TaskDrawer'
import { tr, trn } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table

const Plain = ({ children }) => <div>{children}</div>

const TaskCard = ({ t, onOpen }) => (
    <div onClick={() => onOpen(t.id)} className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className={cn('h-1', prioOf(t.priority).bar)} />
        <div className="space-y-2 p-3">
            <div className="text-sm font-semibold leading-snug">{t.name}</div>
            {t.rel && <div className="truncate text-xs text-gray-500">{t.rel.href ? <Link to={t.rel.href} onClick={(e) => e.stopPropagation()} className="hover:underline">{t.rel.label}</Link> : t.rel.label}</div>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                {t.dueDate && <span className={cn('inline-flex items-center gap-1', isOverdue(t) && 'font-semibold text-red-500')}><TbCalendar />{fmtDate(t.dueDate)}</span>}
                {t.checklistTotal > 0 && <span className="inline-flex items-center gap-1"><TbChecklist />{t.checklistDone}/{t.checklistTotal}</span>}
                {t.comments > 0 && <span className="inline-flex items-center gap-1"><TbMessage />{t.comments}</span>}
                {t.recurring && <TbRepeat title={tr("Recurring")} />}
                <span className={cn('ml-auto text-[11px] font-medium', prioOf(t.priority).text)}>{prioOf(t.priority).label}</span>
            </div>
            <People list={t.assignees} />
        </div>
    </div>
)

const TasksBoard = ({ projectId = null }) => {
    const nav = useNavigate()
    const [params, setParams] = useSearchParams()
    const [data, setData] = useState({ list: [], counts: {}, can: {} })
    const [lookups, setLookups] = useState({ staff: [] })
    const [view, setView] = useState(() => { try { return localStorage.getItem('tasks.view') || 'board' } catch { return 'board' } })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [mine, setMine] = useState(false)
    const [assignee, setAssignee] = useState(null)
    const [priority, setPriority] = useState(null)
    const [done, setDone] = useState(!!projectId)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
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
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {shownStatuses.map((s) => (
                            <div key={s.value} className="w-72 shrink-0 rounded-xl bg-gray-100/70 p-2 dark:bg-gray-900/40">
                                <div className="flex items-center justify-between px-2 py-2"><div className="flex items-center gap-2 text-sm font-semibold"><span className={cn('h-2.5 w-2.5 rounded-full', s.dot)} />{s.label}</div><span className="rounded-full bg-white px-2 text-xs text-gray-500 dark:bg-gray-800">{(columns[s.value] || []).length}</span></div>
                                <Droppable droppableId={String(s.value)}>
                                    {(prov, snap) => (
                                        <div ref={prov.innerRef} {...prov.droppableProps} className={cn('min-h-[120px] space-y-2 rounded-lg p-1 transition', snap.isDraggingOver && 'bg-blue-50 dark:bg-blue-900/10')}>
                                            {(columns[s.value] || []).map((t, i) => (
                                                <Draggable key={t.id} draggableId={t.id} index={i} isDragDisabled={!data.can.edit || t.canFinish === false}>
                                                    {(p) => <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}><TaskCard t={t} onOpen={open} /></div>}
                                                </Draggable>
                                            ))}
                                            {prov.placeholder}
                                            {!loading && !(columns[s.value] || []).length && <div className="py-6 text-center text-xs text-gray-400">{tr("Nothing here")}</div>}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
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

            <TaskDrawer open={drawer.open} id={drawer.id} staff={lookups.staff} presets={projectId ? { relType: 'project', relId: projectId } : null} onClose={close} onChanged={load} />
        </Wrap>
    )
}

export default TasksBoard
