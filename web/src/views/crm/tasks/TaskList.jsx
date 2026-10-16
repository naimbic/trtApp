import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { MdDragIndicator } from 'react-icons/md'
import { TbCalendarDue, TbCalendarEvent, TbCalendarWeek, TbLoader, TbHourglass, TbCircleCheck as TbDone, TbClock, TbUserOff, TbPlayerPlay, TbAlertTriangle, TbBookmarks, TbHierarchy2, TbCircleCheck, TbCircleCheckFilled, TbSearch, TbLayoutKanban, TbPlus } from 'react-icons/tb'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import classNames from '@/utils/classNames'
import { api, qs, notify } from '../kit/api'
import { STATUS, PRIORITY, statusOf, prioOf, initials } from './shared'
import TaskDrawer from './TaskDrawer'
import TemplatesDialog from './TemplatesDialog'
import { tr, trn } from '@/utils/t'

const { TBody, Tr, Td } = Table
const Shell = ({ embedded, children }) => (embedded ? <div>{children}</div> : <AdaptiveCard>{children}</AdaptiveCard>)
// same pastel pills as the template's task list
const PILL = 'dark:text-gray-900'
const STATUS_PILL = { 1: 'bg-amber-200 dark:bg-amber-200', 4: 'bg-sky-200 dark:bg-sky-200', 3: 'bg-purple-200 dark:bg-purple-200', 2: 'bg-orange-200 dark:bg-orange-200', 5: 'bg-emerald-200 dark:bg-emerald-200' }
const PRIO_PILL = { 1: 'bg-purple-200 dark:bg-purple-200', 2: 'bg-orange-200 dark:bg-orange-200', 3: 'bg-red-200 dark:bg-red-200', 4: 'bg-red-300 dark:bg-red-300' }
const ORDER_KEY = 'tasks.groupOrder'

const Pill = ({ cls, children }) => <Tag className={classNames('mr-2 rtl:ml-2 mb-2', cls, PILL)}>{children}</Tag>

/** One line, same columns as the template: grip, check, name, status, priority, date, person. */
const TaskRow = ({ t, dragHandle, onToggle, onOpen, canEdit, innerRef, ...rest }) => {
    const done = t.status === 5
    const who = t.assignees[0]
    return (
        <Tr ref={innerRef} {...rest}>
            <Td className="w-[40px] text-lg">{dragHandle}</Td>
            <Td className="w-[40px]">
                <button type="button" className="cursor-pointer pt-1 text-2xl" disabled={!canEdit || t.canFinish === false} title={t.canFinish === false ? tr("Only the people assigned to this task, or who created it, can change its status") : undefined} onClick={() => onToggle(t)}>
                    {done ? <TbCircleCheckFilled className="text-primary" /> : <TbCircleCheck className="hover:text-primary" />}
                </button>
            </Td>
            <Td className="min-w-[220px]">
                <button type="button" onClick={() => onOpen(t.id)} className={classNames('heading-text text-left font-bold hover:text-primary', done && 'line-through opacity-50')}>{t.name}</button>
                {(t.parent || t.subtasks?.total > 0) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        {t.parent && <button type="button" className="truncate hover:text-primary" onClick={() => onOpen(t.parent.id)}>↳ {t.parent.name}</button>}
                        {t.subtasks?.total > 0 && <span className="inline-flex items-center gap-1"><TbHierarchy2 />{t.subtasks.done}/{t.subtasks.total}</span>}
                    </div>
                )}
            </Td>
            <Td className="w-[150px]"><Pill cls={STATUS_PILL[t.status]}>{statusOf(t.status).label}</Pill></Td>
            <Td className="w-[130px]"><Pill cls={PRIO_PILL[t.priority]}>{prioOf(t.priority).label}</Pill></Td>
            <Td className="w-[140px]"><span className={classNames('font-semibold', t.dueDate && !done && dayjs(t.dueDate).endOf('day').isBefore(dayjs()) && 'text-red-500')}>{t.dueDate ? dayjs(t.dueDate).format('MMMM DD') : '-'}</span></Td>
            <Td className="w-[200px]">
                {who ? (
                    <div className="flex items-center gap-2">
                        <Avatar size="sm" shape="circle" src={who.image || undefined}>{initials(who.name)}</Avatar>
                        <span className="heading-text truncate font-bold">{who.name}</span>
                        {t.assignees.length > 1 && <span className="text-xs text-gray-400">+{t.assignees.length - 1}</span>}
                    </div>
                ) : '-'}
            </Td>
        </Tr>
    )
}

/** The "+ Add task" bar that opens into a small form, like the template. */
const AddTask = ({ open, onOpen, onClose, staff, me, onCreate, defaults, defaultDue = '' }) => {
    const ref = useRef(null)
    const [name, setName] = useState('')
    const [status, setStatus] = useState(1)
    const [priority, setPriority] = useState(2)
    const [assignee, setAssignee] = useState(me)
    const [due, setDue] = useState('')
    useEffect(() => { if (open) { setName(''); setStatus(defaults?.status || 1); setPriority(defaults?.priority || 2); setAssignee(me); setDue(defaultDue); setTimeout(() => ref.current?.focus(), 50) } }, [open, me, defaults, defaultDue])
    const create = () => { if (!name.trim()) return; onCreate({ name: name.trim(), status, priority, assigneeIds: assignee ? [assignee] : [], dueDate: due || null }) }
    const portal = { menuPortalTarget: document.body, menuPosition: 'fixed', styles: { menuPortal: (b) => ({ ...b, zIndex: 10000 }) } }
    if (!open) return <Button block variant="default" icon={<TbPlus />} onClick={onOpen}>{tr('Add task')}</Button>
    return (
        <div className="rounded-2xl border border-gray-200 p-3 dark:border-gray-600">
            <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[220px] flex-1"><Input ref={ref} size="sm" value={name} placeholder={tr('Task name')} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') onClose() }} /></div>
                <div className="w-40"><Select size="sm" isSearchable={false} {...portal} options={STATUS.map((s) => ({ value: s.value, label: s.label }))} value={{ value: status, label: statusOf(status).label }} onChange={(o) => setStatus(o.value)} /></div>
                <div className="w-32"><Select size="sm" isSearchable={false} {...portal} options={PRIORITY.map((s) => ({ value: s.value, label: s.label }))} value={{ value: priority, label: prioOf(priority).label }} onChange={(o) => setPriority(o.value)} /></div>
                <div className="w-44"><Select size="sm" isClearable {...portal} placeholder={tr('Assigned to')} options={staff.map((s) => ({ value: s.id, label: s.name }))} value={staff.filter((s) => s.id === assignee).map((s) => ({ value: s.id, label: s.name }))[0] || null} onChange={(o) => setAssignee(o?.value || null)} /></div>
                <div className="w-40"><Input size="sm" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
                <Button size="sm" onClick={onClose}>{tr('Cancel')}</Button>
                <Button size="sm" variant="solid" disabled={!name.trim()} onClick={create}>{tr('Add')}</Button>
            </div>
        </div>
    )
}

/* ---- date filter: one click for the daily follow-up, or any range on the due / start / completion date ---- */
dayjs.extend(relativeTime)
const ymd = (d) => dayjs(d).format('YYYY-MM-DD')
const PERIODS = () => [['all', tr('All dates')], ['today', tr('Today')], ['tomorrow', tr('Tomorrow')], ['week', tr('This week')], ['overdue', tr('Overdue')], ['nodate', tr('No date')], ['done', tr('Done today')], ['custom', tr('Custom')]]
const DATE_FIELDS = () => [{ value: 'dueDate', label: tr('Due date') }, { value: 'startDate', label: tr('Start date') }, { value: 'dateFinished', label: tr('Completed on') }]
/** The API parameters of a period (whole days, the person's own today). */
const periodParams = (period, field, from, to) => {
    const today = ymd(new Date())
    if (period === 'today') return { from: today, to: today }
    if (period === 'tomorrow') return { from: ymd(dayjs().add(1, 'day')), to: ymd(dayjs().add(1, 'day')) }
    if (period === 'week') { const monday = dayjs().subtract((dayjs().day() + 6) % 7, 'day'); return { from: ymd(monday), to: ymd(monday.add(6, 'day')) } }
    if (period === 'overdue') return { overdue: '1', today }
    if (period === 'nodate') return { noDate: '1' }
    if (period === 'done') return { dateField: 'dateFinished', from: today, to: today }
    if (period === 'custom') return { dateField: field, from, to }
    return {}
}

/** One small card: a figure, what it counts, and a click that filters the list below to it. */
const Mini = ({ icon, label, value, sub, tone, active, onClick }) => (
    <button type="button" onClick={onClick} className={classNames('flex items-center gap-3 rounded-2xl border bg-white p-3 text-start transition hover:shadow-md dark:bg-gray-800', active ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-primary dark:border-gray-600')}>
        <span className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl', MINI_TONE[tone])}>{icon}</span>
        <span className="min-w-0"><span className="block text-xl font-bold leading-tight heading-text">{value}</span><span className="block truncate text-xs text-gray-500">{label}</span>{sub && <span className="block truncate text-[11px] text-gray-400">{sub}</span>}</span>
    </button>
)
const MINI_TONE = { blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20', red: 'bg-red-100 text-red-600 dark:bg-red-500/20', amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20', green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20', violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20', teal: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20', slate: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20' }

/** What a new task starts with, from Settings → Tasks. */
const taskDefaults = (l) => (l.defaults ? { status: l.defaults.status, priority: l.defaults.priority, billable: l.defaults.billable, assigneeIds: l.defaults.assignMe && l.me ? [l.me] : [], followerIds: l.defaults.followMe && l.me ? [l.me] : [] } : {})

/** "My tasks" and "Team tasks": the template's grouped task list, one group per project. */
const TaskList = ({ projectId = null }) => {
    const { pathname } = useLocation()
    const nav = useNavigate()
    const scope = projectId ? 'team' : pathname.endsWith('team-tasks') ? 'team' : 'mine'
    const [data, setData] = useState({ list: [], can: {} })
    const [lookups, setLookups] = useState({ staff: [], me: null })
    const [search, setSearch] = useState('')
    const [tpl, setTpl] = useState(false)
    const [allDone, setAllDone] = useState(false)
    const [period, setPeriod] = useState(() => { const p = new URLSearchParams(window.location.search).get('period'); return PERIODS().some(([k]) => k === p) ? p : projectId ? 'all' : 'today' }) // the lists open on today; ?period=week (or any chip) opens another
    const [dateField, setDateField] = useState('dueDate')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [sum, setSum] = useState(null) // the figures of the cards (and the overdue reminder)
    const [statusFilter, setStatusFilter] = useState('') // '4' in progress, '2,3' testing / awaiting feedback
    const [unassignedOnly, setUnassignedOnly] = useState(false)
    const late = sum?.overdue || 0
    const [order, setOrder] = useState(() => { try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]') } catch { return [] } })
    const [adding, setAdding] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: false, id: null })

    useEffect(() => { api('/api/crm/work/tasks/lookups').then(setLookups).catch(() => {}) }, [])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/work/tasks?${qs({ mine: scope === 'mine' ? '1' : '', done: allDone ? '1' : '', limit: 1000, relType: projectId ? 'project' : '', relId: projectId || '', ...periodParams(period, dateField, from, to), statuses: statusFilter, unassigned: unassignedOnly ? '1' : '' })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [scope, allDone, projectId, period, dateField, from, to, statusFilter, unassignedOnly])
    useEffect(() => {
        let alive = true
        const monday = dayjs().subtract((dayjs().day() + 6) % 7, 'day')
        api(`/api/crm/work/tasks/summary?${qs({ mine: scope === 'mine' ? '1' : '', today: ymd(new Date()), weekFrom: ymd(monday), weekTo: ymd(monday.add(6, 'day')), relType: projectId ? 'project' : '', relId: projectId || '' })}`).then((r) => alive && setSum(r)).catch(() => {})
        return () => { alive = false }
    }, [scope, projectId, data.list]) // refreshed whenever the list changes (a task ticked off updates the cards)
    useEffect(() => { setLoading(true); load() }, [load])

    // groups = projects (plus the tasks that belong to no project)
    const groups = useMemo(() => {
        const q = search.trim().toLowerCase()
        const map = new Map()
        for (const t of data.list) {
            if (q && !t.name.toLowerCase().includes(q) && !(t.rel?.label || '').toLowerCase().includes(q)) continue
            const isProject = t.rel?.type === 'project' && t.relId
            // inside a project the blocks are its milestones; everywhere else they are the projects
            const key = projectId ? (t.milestoneId ? `ms:${t.milestoneId}` : 'other') : isProject ? `project:${t.relId}` : 'other'
            if (!map.has(key)) map.set(key, projectId
                ? { key, title: t.milestone?.name || tr('No milestone'), relType: 'project', relId: projectId, milestoneId: t.milestoneId || null, list: [] }
                : { key, title: isProject ? t.rel.label : tr('Other tasks'), relType: isProject ? 'project' : null, relId: isProject ? t.relId : null, list: [] })
            map.get(key).list.push(t)
        }
        if (adding && !map.has(adding)) map.set(adding, { key: adding, title: projectId ? tr('No milestone') : tr('Other tasks'), relType: projectId ? 'project' : null, relId: projectId || null, milestoneId: null, list: [] })
        const arr = [...map.values()].sort((a, b) => (a.key === 'other') - (b.key === 'other') || a.title.localeCompare(b.title))
        const pos = (k) => { const i = order.indexOf(k); return i < 0 ? 9999 : i }
        return arr.sort((a, b) => pos(a.key) - pos(b.key))
    }, [data.list, search, order, adding, projectId])

    const people = useMemo(() => { const m = new Map(); data.list.forEach((t) => t.assignees.forEach((a) => m.set(a.id, a))); return [...m.values()] }, [data.list])
    const openCount = data.list.filter((t) => t.status !== 5).length

    const persistOrder = (keys) => { setOrder(keys); try { localStorage.setItem(ORDER_KEY, JSON.stringify(keys)) } catch { /* private mode */ } }
    const onDragEnd = async (r) => {
        if (!r.destination) return
        const { source: s, destination: d } = r
        if (s.droppableId === d.droppableId && s.index === d.index) return
        if (r.type === 'COLUMN') {
            const keys = groups.map((g) => g.key)
            const [moved] = keys.splice(s.index, 1)
            keys.splice(d.index, 0, moved)
            persistOrder(keys)
            return
        }
        const from = groups.find((g) => g.key === s.droppableId), to = groups.find((g) => g.key === d.droppableId)
        if (!from || !to || !data.can.edit) return
        const task = from.list[s.index]
        const dest = [...to.list.filter((t) => t.id !== task.id)]
        dest.splice(d.index, 0, projectId ? { ...task, milestoneId: to.milestoneId, milestone: to.milestoneId ? { id: to.milestoneId, name: to.title } : null } : { ...task, relType: to.relType, relId: to.relId, rel: to.relType ? { type: 'project', label: to.title } : null })
        // optimistic update: the task lives in its new group right away
        setData((cur) => ({ ...cur, list: [...cur.list.filter((t) => !(to.list.concat(from.list)).some((x) => x.id === t.id)), ...dest, ...from.list.filter((t) => t.id !== task.id && from.key !== to.key)] }))
        try { await api('/api/crm/work/tasks/regroup', { method: 'POST', body: projectId ? { id: task.id, milestoneId: to.milestoneId, ids: dest.map((t) => t.id) } : { id: task.id, relType: to.relType || 'none', relId: to.relId, ids: dest.map((t) => t.id) } }) } catch (e) { notify('danger', e.message) }
        load()
    }

    const toggle = async (t) => {
        const to = t.status === 5 ? 1 : 5
        setData((d) => ({ ...d, list: d.list.map((x) => (x.id === t.id ? { ...x, status: to } : x)) }))
        try { await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: to, ids: [t.id] } }) } catch (e) { notify('danger', e.message); load() }
    }
    const create = async (g, body) => {
        try {
            await api('/api/crm/work/tasks', { method: 'POST', body: { ...body, ...(g.relType ? { relType: 'project', relId: g.relId } : {}), ...(projectId && g.milestoneId ? { milestoneId: g.milestoneId } : {}) } })
            notify('success', tr('Task added')); setAdding(''); load()
        } catch (e) { notify('danger', e.message) }
    }
    const open = (id) => (id ? nav(`/crm/tasks/${id}`) : setDrawer({ open: true, id: null }))

    return (
        <Shell embedded={!!projectId}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    {projectId ? <h4>{tr('Tasks')}</h4> : <h3>{scope === 'mine' ? tr('My tasks') : tr('Team tasks')}</h3>}
                    <p className="text-sm text-gray-500">{trn(openCount, 'open task')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {!projectId && <Segment size="sm" value={scope} onChange={(v) => v && v !== scope && nav(v === 'mine' ? '/crm/my-tasks' : '/crm/team-tasks')}>
                        <Segment.Item value="mine">{tr('My tasks')}</Segment.Item>
                        <Segment.Item value="team">{tr('Team tasks')}</Segment.Item>
                    </Segment>}
                    {scope === 'team' && people.length > 0 && <UsersAvatarGroup className="flex items-center" avatarProps={{ size: 'sm' }} imgKey="image" users={people} />}
                    <Button size="sm" icon={<TbLayoutKanban />} onClick={() => nav(projectId ? `/crm/projects/${projectId}/board` : '/crm/scrum-board')}>{tr('Scrum board')}</Button>
                    {data.can.create && <Button size="sm" icon={<TbBookmarks />} onClick={() => setTpl(true)}>{tr('Templates')}</Button>}
                    {data.can.create && <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr('New task')}</Button>}
                </div>
            </div>
            {sum && (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Mini icon={<TbCalendarEvent />} tone="blue" label={tr('Due today')} value={sum.dueToday ? `${sum.dueTodayDone}/${sum.dueToday}` : 0} sub={sum.dueToday ? tr('done') : undefined} active={period === 'today' && !statusFilter && !unassignedOnly} onClick={() => { setPeriod('today'); setStatusFilter(''); setUnassignedOnly(false) }} />
                    <Mini icon={<TbAlertTriangle />} tone={sum.overdue ? 'red' : 'green'} label={tr('Overdue')} value={sum.overdue} active={period === 'overdue' && !statusFilter && !unassignedOnly} onClick={() => { setPeriod('overdue'); setStatusFilter(''); setUnassignedOnly(false) }} />
                    <Mini icon={<TbCalendarDue />} tone="violet" label={tr('Tomorrow')} value={sum.tomorrow} active={period === 'tomorrow' && !statusFilter && !unassignedOnly} onClick={() => { setPeriod('tomorrow'); setStatusFilter(''); setUnassignedOnly(false) }} />
                    <Mini icon={<TbCalendarWeek />} tone="teal" label={tr('This week')} value={sum.week ? `${sum.weekDone}/${sum.week}` : 0} sub={sum.week ? tr('done') : undefined} active={period === 'week' && !statusFilter && !unassignedOnly} onClick={() => { setPeriod('week'); setStatusFilter(''); setUnassignedOnly(false) }} />
                    <Mini icon={<TbLoader />} tone="blue" label={tr('In progress')} value={sum.inProgress} active={statusFilter === '4'} onClick={() => { setPeriod('all'); setUnassignedOnly(false); setStatusFilter(statusFilter === '4' ? '' : '4') }} />
                    <Mini icon={<TbHourglass />} tone="amber" label={tr('Waiting')} value={sum.waiting} sub={tr('testing, feedback')} active={statusFilter === '2,3'} onClick={() => { setPeriod('all'); setUnassignedOnly(false); setStatusFilter(statusFilter === '2,3' ? '' : '2,3') }} />
                    {scope === 'team' && !projectId
                        ? <Mini icon={<TbUserOff />} tone="slate" label={tr('Unassigned')} value={sum.unassigned} active={unassignedOnly} onClick={() => { setPeriod('all'); setStatusFilter(''); setUnassignedOnly(!unassignedOnly) }} />
                        : <Mini icon={<TbDone />} tone="green" label={tr('Done today')} value={sum.doneToday} active={period === 'done' && !statusFilter} onClick={() => { setPeriod('done'); setStatusFilter(''); setUnassignedOnly(false) }} />}
                    {sum.running
                        ? <Mini icon={<TbPlayerPlay />} tone="green" label={tr('Timer running')} value={dayjs(sum.running.since).fromNow(true)} sub={sum.running.name} onClick={() => open(sum.running.id)} />
                        : <Mini icon={<TbClock />} tone="slate" label={tr('Time today')} value={`${sum.hoursToday} h`} onClick={() => nav('/crm/time-report')} />}
                </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="w-full sm:w-72"><Input size="sm" value={search} prefix={<TbSearch className="text-lg" />} placeholder={tr('Search tasks')} onChange={(e) => setSearch(e.target.value)} /></div>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={allDone} onChange={setAllDone} />{tr('Show all completed')}</label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                {PERIODS().map(([k, label]) => <button key={k} type="button" onClick={() => { setPeriod(k); setStatusFilter(''); setUnassignedOnly(false) }} className={classNames('rounded-full px-3 py-1 text-sm font-semibold transition', period === k && !statusFilter && !unassignedOnly ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300', k === 'overdue' && period !== k && 'text-red-500')}>{label}</button>)}
                {(statusFilter || unassignedOnly) && <button type="button" onClick={() => { setStatusFilter(''); setUnassignedOnly(false) }} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white">{unassignedOnly ? tr('Unassigned') : statusFilter === '4' ? tr('In progress') : tr('Waiting')} ×</button>}
                {period === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="w-40"><Select size="sm" isSearchable={false} options={DATE_FIELDS()} value={DATE_FIELDS().find((o) => o.value === dateField)} onChange={(o) => setDateField(o.value)} /></div>
                        <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label={tr('From')} className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
                        <span className="text-gray-400">→</span>
                        <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label={tr('To')} className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
                    </div>
                )}
            </div>
            {late > 0 && period !== 'overdue' && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    <TbAlertTriangle className="text-lg" />
                    <span>{trn(late, 'unfinished task is overdue', 'unfinished tasks are overdue')}</span>
                    <button type="button" className="font-semibold underline" onClick={() => setPeriod('overdue')}>{tr('Show them')}</button>
                </div>
            )}
            {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}

            <div className="my-8">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="board" type="COLUMN" direction="vertical">
                        {(prov) => (
                            <div ref={prov.innerRef} {...prov.droppableProps}>
                                <div className="flex flex-col gap-10">
                                    {groups.map((g, gi) => (
                                        <Draggable key={g.key} draggableId={g.key} index={gi}>
                                            {(p) => (
                                                <div ref={p.innerRef} {...p.draggableProps}>
                                                    <div className="mb-4 flex items-center gap-2">
                                                        <span className="text-lg" {...p.dragHandleProps}><MdDragIndicator /></span>
                                                        <h4>{g.title}</h4>
                                                        <span className="rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-500 dark:bg-gray-700">{g.list.length}</span>
                                                    </div>
                                                    <Table className="lg:overflow-hidden">
                                                        <Droppable droppableId={g.key} type="CONTENT">
                                                            {(dp) => (
                                                                <TBody ref={dp.innerRef} {...dp.droppableProps}>
                                                                    {g.list.map((t, ti) => (
                                                                        <Draggable key={t.id} draggableId={t.id} index={ti} isDragDisabled={!data.can.edit || t.canFinish === false}>
                                                                            {(tp) => <TaskRow t={t} innerRef={tp.innerRef} dragHandle={<span {...tp.dragHandleProps}><MdDragIndicator /></span>} onToggle={toggle} onOpen={open} canEdit={data.can.edit} {...tp.draggableProps} />}
                                                                        </Draggable>
                                                                    ))}
                                                                    {dp.placeholder}
                                                                </TBody>
                                                            )}
                                                        </Droppable>
                                                    </Table>
                                                    {data.can.create && <div className="mt-4"><AddTask open={adding === g.key} onOpen={() => setAdding(g.key)} onClose={() => setAdding('')} staff={lookups.staff} me={lookups.me} defaults={lookups.defaults} defaultDue={period === 'today' ? ymd(new Date()) : ''} onCreate={(b) => create(g, b)} /></div>}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {prov.placeholder}
                                </div>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                {!loading && !groups.length && <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center text-gray-400 dark:border-gray-600">{scope === 'mine' ? tr('Nothing on your plate. 🎉') : tr('No task to show.')}</div>}
                {loading && !groups.length && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            </div>

            <TemplatesDialog isOpen={tpl} onClose={() => setTpl(false)} context={projectId ? { relType: 'project', relId: projectId } : {}} onUsed={(id) => nav(`/crm/tasks/${id}`)} />
            <TaskDrawer open={drawer.open} id={drawer.id} staff={lookups.staff} presets={{ ...taskDefaults(lookups), ...(period === 'today' ? { dueDate: new Date() } : {}), ...(projectId ? { relType: 'project', relId: projectId } : {}) }} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onChanged={load} />
        </Shell>
    )
}

export default TaskList
