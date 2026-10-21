/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Link } from 'react-router'
import { TbFlag, TbCircleCheck, TbAlertTriangle, TbPlus, TbGripVertical, TbDots, TbPencil, TbTrash, TbChecks, TbListCheck, TbSearch, TbCalendarEvent } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import Dropdown from '@/components/ui/Dropdown'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { api, notify, qs } from '../kit/api'
import { tr, trn } from '@/utils/t'

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#6b7280']
const STATE = {
    done: ['bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', 'Done'],
    overdue: ['bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300', 'Overdue'],
    soon: ['bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', 'Due soon'],
    open: ['bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300', 'On track'],
    empty: ['bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300', 'No tasks'],
}
const Label = ({ children, hint }) => <div className="mb-1.5 flex items-baseline justify-between gap-2"><label className="form-label block">{children}</label>{hint && <span className="text-xs text-gray-400">{hint}</span>}</div>

const dueText = (m) => {
    if (!m.dueDate) return tr('No date')
    const d = dayjs(m.dueDate).format('DD MMM YYYY')
    if (m.state === 'done') return d
    if (m.daysLeft < 0) return `${d} · ${trn(-m.daysLeft, 'day')} ${tr('late')}`
    if (m.daysLeft === 0) return `${d} · ${tr('today')}`
    return `${d} · ${tr('in {n} d', { n: m.daysLeft })}`
}

/** New / edit milestone, with the tasks it holds and a quick way to add one. */
const MilestoneDialog = ({ state, projects, can, onClose, onSaved }) => {
    const { open, id, projectId } = state
    const [v, setV] = useState({ name: '', projectId: null, dueDate: '', color: COLORS[0], description: '', visibleToCustomer: false })
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(false)
    const [busy, setBusy] = useState(false)
    const [newTask, setNewTask] = useState('')
    const taskRef = useRef(null)
    const load = useCallback(async () => {
        if (!id) return
        const m = await api(`/api/crm/milestones-board/${id}`)
        setV({ name: m.name, projectId: m.projectId, dueDate: m.dueDate ? dayjs(m.dueDate).format('YYYY-MM-DD') : '', color: m.color || COLORS[0], description: m.description, visibleToCustomer: m.visibleToCustomer })
        setTasks(m.taskList)
    }, [id])
    useEffect(() => {
        if (!open) return
        setNewTask('')
        if (!id) { setV({ name: '', projectId: projectId || null, dueDate: '', color: COLORS[(projects.flatMap((p) => p.milestones).length) % COLORS.length], description: '', visibleToCustomer: false }); setTasks([]); return }
        setLoading(true); load().catch((e) => notify('danger', e.message)).finally(() => setLoading(false))
    }, [open, id]) // eslint-disable-line react-hooks/exhaustive-deps
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const opts = projects.map((p) => ({ value: p.id, label: p.name }))
    const save = async () => {
        setBusy(true)
        try { await api(id ? `/api/crm/milestones-board/${id}` : '/api/crm/milestones-board', { method: id ? 'PUT' : 'POST', body: v }); notify('success', id ? tr('Milestone saved') : tr('Milestone created')); onSaved(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const addTask = async () => {
        const name = newTask.trim()
        if (!name) return
        try {
            await api('/api/crm/work/tasks', { method: 'POST', body: { name, relType: 'project', relId: v.projectId, milestoneId: id, dueDate: v.dueDate || null } })
            setNewTask(''); await load(); onSaved()
        } catch (e) { notify('danger', e.message) }
    }
    return (
        <Dialog isOpen={open} width={640} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-4 pr-10">{id ? tr('Edit milestone') : tr('New milestone')}</h5>
            {loading ? <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div> : (
                <div className="max-h-[68vh] overflow-y-auto pr-1">
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2"><Label>{tr('Name')}</Label><Input autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder={tr('For example: Design approved')} /></div>
                        <div><Label>{tr('Project')}</Label><Select isDisabled={!!id} options={opts} value={opts.find((o) => o.value === v.projectId) || null} onChange={(o) => set({ projectId: o?.value || null })} /></div>
                        <div><Label hint={tr('optional')}>{tr('Due date')}</Label><Input type="date" value={v.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></div>
                        <div className="md:col-span-2"><Label>{tr('Colour')}</Label>
                            <div className="flex flex-wrap items-center gap-2">
                                {COLORS.map((c) => <button key={c} type="button" aria-label={c} onClick={() => set({ color: c })} className={`size-7 rounded-full border-2 ${v.color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`} style={{ background: c }} />)}
                                <input type="color" value={v.color || COLORS[0]} onChange={(e) => set({ color: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-gray-200 bg-transparent p-0.5" aria-label={tr('Colour')} />
                            </div>
                        </div>
                        <div className="md:col-span-2"><Label>{tr('Description')}</Label><Input textArea rows={3} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
                        <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2"><Switcher checked={v.visibleToCustomer} onChange={(c) => set({ visibleToCustomer: c })} />{tr('Show the description to the customer')}</label>
                    </div>
                    {id && (
                        <section className="border-t border-gray-100 pt-4 dark:border-gray-700">
                            <h6 className="mb-2">{tr('Tasks in this milestone')} <span className="font-normal text-gray-400">({tasks.filter((t) => t.status === 5).length}/{tasks.length})</span></h6>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {tasks.map((t) => (
                                    <div key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                                        <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${t.status === 5 ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300'}`}>{t.status === 5 && <TbCircleCheck className="text-xs" />}</span>
                                        <Link to={`/crm/tasks-board?task=${t.id}`} className={`min-w-0 flex-1 truncate hover:underline ${t.status === 5 ? 'text-gray-400 line-through' : ''}`}>{t.name}</Link>
                                        {t.dueDate && <span className="shrink-0 text-xs text-gray-400">{dayjs(t.dueDate).format('DD MMM')}</span>}
                                    </div>
                                ))}
                                {!tasks.length && <p className="py-2 text-sm text-gray-400">{tr('No tasks yet.')}</p>}
                            </div>
                            {can.tasks && (
                                <div className="mt-2 flex gap-2">
                                    <Input ref={taskRef} size="sm" value={newTask} placeholder={tr('Add a task to this milestone')} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
                                    <Button size="sm" icon={<TbPlus />} onClick={addTask}>{tr('Add')}</Button>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}
            <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>{tr('Cancel')}</Button>{(id ? can.edit : can.create) && <Button variant="solid" loading={busy} onClick={save}>{tr('Save')}</Button>}</div>
        </Dialog>
    )
}

/** One project: its milestones as rows (drag to reorder), a quick-add line, progress per milestone. */
const ProjectBlock = ({ p, can, filter, onOpen, onChanged, onComplete, onDelete }) => {
    const [name, setName] = useState('')
    const [date, setDate] = useState('')
    const [list, setList] = useState(p.milestones)
    const [over, setOver] = useState(null)
    const drag = useRef(null)
    useEffect(() => setList(p.milestones), [p.milestones])
    const shown = list.filter((m) => filter === 'all' || (filter === 'open' ? m.state !== 'done' : m.state === filter))
    const add = async () => {
        if (!name.trim()) return
        try { await api('/api/crm/milestones-board', { method: 'POST', body: { name, dueDate: date || null, projectId: p.id } }); setName(''); setDate(''); onChanged() } catch (e) { notify('danger', e.message) }
    }
    const drop = async (to) => {
        const from = drag.current; drag.current = null; setOver(null)
        if (from === null || from === to) return
        const next = [...list]; const [m] = next.splice(from, 1); next.splice(to, 0, m)
        setList(next)
        try { await api('/api/crm/milestones-board/reorder', { method: 'POST', body: { projectId: p.id, ids: next.map((x) => x.id) } }) } catch (e) { notify('danger', e.message); onChanged() }
    }
    const done = p.milestones.filter((m) => m.state === 'done').length
    return (
        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                <TbFlag className="text-lg text-primary" />
                <Link to={`/crm/projects/${p.id}`} className="text-[15px] font-extrabold hover:underline">{p.name}</Link>
                {p.client && <span className="text-xs text-gray-400">{p.client}</span>}
                <span className="ml-auto text-xs text-gray-400">{tr('{a} of {b} milestones done', { a: done, b: p.milestones.length })}{p.noMilestoneTasks > 0 && ` · ${trn(p.noMilestoneTasks, 'open task')} ${tr('without a milestone')}`}</span>
            </header>
            {can.create && (
                <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-2 dark:border-gray-700 dark:bg-gray-700/20" onKeyDown={(e) => e.key === 'Enter' && e.target.tagName === 'INPUT' && (e.preventDefault(), add())}>
                    <input className="h-8 min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white px-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800" placeholder={tr('New milestone')} aria-label={tr('New milestone')} value={name} onChange={(e) => setName(e.target.value)} />
                    <input type="date" className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800" aria-label={tr('Due date')} value={date} onChange={(e) => setDate(e.target.value)} />
                    <Button size="xs" variant="solid" icon={<TbPlus />} onClick={add}>{tr('Add')}</Button>
                </div>
            )}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {shown.map((m) => {
                    const i = list.indexOf(m)
                    const [cls, label] = STATE[m.state]
                    return (
                        <div key={m.id} className={`group grid grid-cols-[18px_1fr_auto] items-center gap-3 px-3 py-2.5 md:grid-cols-[18px_minmax(160px,1.4fr)_minmax(150px,1fr)_minmax(140px,1fr)_auto] ${over === i ? 'bg-primary/5' : ''}`}
                            onDragOver={(e) => { if (drag.current !== null) { e.preventDefault(); setOver(i) } }} onDrop={(e) => { e.preventDefault(); drop(i) }}>
                            <TbGripVertical className={`text-lg text-gray-300 ${can.edit && filter === 'all' ? 'cursor-grab' : 'opacity-0'}`} draggable={can.edit && filter === 'all'} onDragStart={() => { drag.current = i }} onDragEnd={() => { drag.current = null; setOver(null) }} aria-hidden="true" />
                            <button type="button" onClick={() => onOpen({ open: true, id: m.id })} className="flex min-w-0 items-center gap-2 text-left">
                                <span className="size-3 shrink-0 rounded-full" style={{ background: m.color || '#9ca3af' }} />
                                <span className={`truncate font-bold hover:underline ${m.state === 'done' ? 'text-gray-400 line-through' : ''}`}>{m.name}</span>
                            </button>
                            <div className="col-span-2 col-start-2 flex items-center gap-2 md:col-span-1 md:col-start-auto">
                                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${cls}`}>{tr(label)}</span>
                                <span className="flex min-w-0 items-center gap-1 truncate text-xs text-gray-500"><TbCalendarEvent className="shrink-0" />{dueText(m)}</span>
                            </div>
                            <div className="col-span-2 col-start-2 md:col-span-1 md:col-start-auto">
                                <div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full" style={{ width: `${m.percent}%`, background: m.state === 'overdue' ? '#ef4444' : m.color || '#2563eb' }} /></div><span className="w-9 text-right text-xs font-bold tabular-nums">{m.percent}%</span></div>
                                <div className="mt-0.5 text-xs text-gray-400">{m.tasks.total ? `${m.tasks.done}/${m.tasks.total} ${tr('tasks')}${m.tasks.late ? ` · ${m.tasks.late} ${tr('late')}` : ''}` : tr('No tasks')}</div>
                            </div>
                            <div className="row-start-1 col-start-3 justify-self-end md:row-start-auto md:col-start-auto">
                                {(can.edit || can.delete) && (
                                    <Dropdown placement="bottom-end" renderTitle={<button type="button" aria-label={tr('Options')} className="flex size-7 items-center justify-center rounded-full text-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><TbDots /></button>}>
                                        <Dropdown.Item eventKey="e" onClick={() => onOpen({ open: true, id: m.id })}><span className="flex items-center"><TbPencil className="mr-2 text-lg" />{tr('Edit')}</span></Dropdown.Item>
                                        {can.edit && can.tasks && m.tasks.total > m.tasks.done && <Dropdown.Item eventKey="c" onClick={() => onComplete(m)}><span className="flex items-center"><TbChecks className="mr-2 text-lg" />{tr('Complete all tasks')}</span></Dropdown.Item>}
                                        <Dropdown.Item eventKey="t" onClick={() => onOpen({ open: true, id: m.id })}><span className="flex items-center"><TbListCheck className="mr-2 text-lg" />{tr('Tasks')}</span></Dropdown.Item>
                                        {can.delete && <Dropdown.Item eventKey="x" onClick={() => onDelete(m)}><span className="flex items-center text-red-500"><TbTrash className="mr-2 text-lg" />{tr('Delete')}</span></Dropdown.Item>}
                                    </Dropdown>
                                )}
                            </div>
                        </div>
                    )
                })}
                {!shown.length && <div className="px-4 py-5 text-sm text-gray-400">{p.milestones.length ? tr('Nothing here') : tr('No milestones yet. Add the first one above.')}</div>}
            </div>
        </section>
    )
}

/** Project milestones: every project with its milestones, dates and progress, in one place. */
const MilestonesPage = () => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('all')
    const [project, setProject] = useState(null)
    const [search, setSearch] = useState('')
    const [q, setQ] = useState('')
    const [dlg, setDlg] = useState({ open: false, id: null, projectId: null })
    const [del, setDel] = useState(null)
    const [done, setDone] = useState(null)
    useEffect(() => { const t = setTimeout(() => setQ(search), 250); return () => clearTimeout(t) }, [search])
    const load = useCallback(() => { api(`/api/crm/milestones-board?${qs({ projectId: project, q })}`).then((x) => { setD(x); setError('') }).catch((e) => setError(e.message)) }, [project, q])
    useEffect(() => { load() }, [load])
    const [allProjects, setAll] = useState([])
    useEffect(() => { if (d && !project && !q) setAll(d.projects) }, [d, project, q])
    const projectOpts = useMemo(() => allProjects.map((p) => ({ value: p.id, label: p.name })), [allProjects])
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); load() } catch (e) { notify('danger', e.message) } }
    const visible = d?.projects.filter((p) => !project || p.id === project) || []
    return (
        <Container>
            <InvoiceHead
                title={tr('Milestones')}
                stats={[
                    { icon: <TbFlag />, label: tr('Milestones'), value: d ? String(d.stats.total) : '–' },
                    { icon: <TbListCheck />, label: tr('Open'), value: d ? String(d.stats.open) : '–' },
                    { icon: <TbAlertTriangle />, label: tr('Overdue'), value: d ? String(d.stats.overdue) : '–' },
                    { icon: <TbCircleCheck />, label: tr('Done'), value: d ? String(d.stats.done) : '–' },
                ]}
            />
            <div className="cx-tools">
                <Segment size="sm" value={filter} onChange={(v) => v && setFilter(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="all">{tr('All')}</Segment.Item><Segment.Item value="open">{tr('Open')}</Segment.Item><Segment.Item value="overdue">{tr('Overdue')}</Segment.Item><Segment.Item value="done">{tr('Done')}</Segment.Item>
                </Segment>
                <div className="w-52"><Select size="sm" isClearable placeholder={tr('All projects')} options={projectOpts} value={projectOpts.find((o) => o.value === project) || null} onChange={(o) => setProject(o?.value || null)} /></div>
                <div className="w-48"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr('Search…')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                {d?.can.create && <Button size="sm" variant="solid" className="ml-auto" icon={<TbPlus />} onClick={() => setDlg({ open: true, id: null, projectId: project })}>{tr('New milestone')}</Button>}
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="flex flex-col gap-4">
                {visible.map((p) => (
                    <ProjectBlock key={p.id} p={p} can={d.can} filter={filter} onOpen={setDlg} onChanged={load}
                        onComplete={(m) => setDone(m)} onDelete={(m) => setDel(m)} />
                ))}
            </div>
            {d && !visible.length && <div className="py-12 text-center text-gray-400">{tr('No projects with milestones to show.')}</div>}
            {!d && !error && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            {d && <MilestoneDialog state={dlg} projects={d.projects.length ? d.projects : allProjects} can={d.can} onClose={() => setDlg((x) => ({ ...x, open: false }))} onSaved={load} />}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this milestone?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const m = del; setDel(null); run(() => api(`/api/crm/milestones-board/${m.id}`, { method: 'DELETE' }), tr('Deleted')) }}>
                <p>{del && tr('"{name}" will be deleted. Its {n} tasks stay in the project, without a milestone.', { name: del.name, n: del.tasks.total })}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={!!done} title={tr('Complete all tasks?')} confirmText={tr('Complete')} onClose={() => setDone(null)} onRequestClose={() => setDone(null)} onCancel={() => setDone(null)} onConfirm={() => { const m = done; setDone(null); run(async () => { const r = await api(`/api/crm/milestones-board/${m.id}/complete`, { method: 'POST' }); notify('success', tr('{n} tasks completed', { n: r.completed })) }) }}>
                <p>{done && tr('Every open task of "{name}" will be marked complete.', { name: done.name })}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default MilestonesPage
