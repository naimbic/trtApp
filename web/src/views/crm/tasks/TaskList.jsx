import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { TbPlus, TbSearch, TbCalendar, TbChecklist, TbMessage, TbChevronDown, TbLayoutKanban } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import cn from '@/utils/classNames'
import { api, qs, notify } from '../kit/api'
import { People, initials, isOverdue, prioOf, statusOf } from './shared'
import TaskDrawer from './TaskDrawer'
import { tr, trn } from '@/utils/t'

const dayKey = (t) => (t.dueDate ? dayjs(t.dueDate).format('YYYY-MM-DD') : '')

/** Bucket of a task for "My tasks": overdue, today, this week, later, no date, completed. */
const bucketOf = (t) => {
    if (t.status === 5) return 'done'
    if (!t.dueDate) return 'nodate'
    const d = dayjs(t.dueDate).startOf('day'), today = dayjs().startOf('day')
    if (d.isBefore(today)) return 'overdue'
    if (d.isSame(today)) return 'today'
    if (d.isBefore(today.add(8, 'day'))) return 'week'
    return 'later'
}
const BUCKETS = [
    ['overdue', tr('Overdue'), 'text-red-500'],
    ['today', tr('Today'), 'text-primary'],
    ['week', tr('Next 7 days'), ''],
    ['later', tr('Later'), ''],
    ['nodate', tr('No due date'), 'text-gray-500'],
    ['done', tr('Completed'), 'text-emerald-600'],
]

const Row = ({ t, onOpen, onToggle, canEdit, showAssignees }) => {
    const p = prioOf(t.priority)
    const done = t.status === 5
    return (
        <div className="group flex items-center gap-3 border-b border-gray-100 px-2 py-2.5 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40">
            <input type="checkbox" checked={done} disabled={!canEdit} onChange={() => onToggle(t)} className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-[var(--primary)]" />
            <button type="button" onClick={() => onOpen(t.id)} className="min-w-0 flex-1 text-left">
                <div className={cn('truncate text-sm font-semibold', done ? 'text-gray-400 line-through' : 'heading-text')}>{t.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><span className={cn('h-1.5 w-1.5 rounded-full', statusOf(t.status).dot)} />{statusOf(t.status).label}</span>
                    {t.rel && (t.rel.href ? <Link to={t.rel.href} onClick={(e) => e.stopPropagation()} className="truncate hover:underline">{t.rel.label}</Link> : <span className="truncate">{t.rel.label}</span>)}
                    {t.checklistTotal > 0 && <span className="inline-flex items-center gap-1"><TbChecklist />{t.checklistDone}/{t.checklistTotal}</span>}
                    {t.comments > 0 && <span className="inline-flex items-center gap-1"><TbMessage />{t.comments}</span>}
                </div>
            </button>
            <span className={cn('hidden shrink-0 text-[11px] font-semibold sm:inline', p.text)}>{p.label}</span>
            {t.dueDate && <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs', isOverdue(t) ? 'font-semibold text-red-500' : 'text-gray-500')}><TbCalendar />{dayjs(t.dueDate).format('DD MMM')}</span>}
            {showAssignees && <div className="w-20 shrink-0"><People list={t.assignees} max={3} /></div>}
        </div>
    )
}

const Section = ({ title, tone, count, children, open, onToggle, icon }) => (
    <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-4 py-3 text-left">
            <TbChevronDown className={cn('text-gray-400 transition', !open && '-rotate-90 rtl:rotate-90')} />
            {icon}
            <span className={cn('font-bold', tone)}>{title}</span>
            <span className="rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-500 dark:bg-gray-700">{count}</span>
        </button>
        {open && <div className="px-2 pb-2">{children}</div>}
    </section>
)

/** "My tasks" (the signed-in person's) and "Team tasks" (everyone's, grouped by person) on one page. */
const TaskList = () => {
    const { pathname } = useLocation()
    const nav = useNavigate()
    const scope = pathname.endsWith('team-tasks') ? 'team' : 'mine'
    const [data, setData] = useState({ list: [], can: {} })
    const [lookups, setLookups] = useState({ staff: [], me: null })
    const [search, setSearch] = useState('')
    const [showDone, setShowDone] = useState(false)
    const [closed, setClosed] = useState({ done: true })
    const [quick, setQuick] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: false, id: null })

    useEffect(() => { api('/api/crm/work/tasks/lookups').then(setLookups).catch(() => {}) }, [])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/work/tasks?${qs({ mine: scope === 'mine' ? '1' : '', done: '1', limit: 1000 })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [scope])
    useEffect(() => { setLoading(true); load() }, [load])

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.list.filter((t) => (!q || t.name.toLowerCase().includes(q) || (t.rel?.label || '').toLowerCase().includes(q)) && (showDone || scope === 'mine' || t.status !== 5))
    }, [data.list, search, showDone, scope])

    const groups = useMemo(() => {
        const byDue = (a, b) => (dayKey(a) || '9999').localeCompare(dayKey(b) || '9999') || b.priority - a.priority
        if (scope === 'mine') return BUCKETS.map(([key, title, tone]) => ({ key, title, tone, list: rows.filter((t) => bucketOf(t) === key).sort(byDue) })).filter((g) => g.list.length)
        const out = lookups.staff.map((s) => ({ key: s.id, title: s.name, person: s, list: rows.filter((t) => t.assignees.some((a) => a.id === s.id)).sort(byDue) }))
        out.push({ key: 'none', title: tr('Unassigned'), list: rows.filter((t) => !t.assignees.length).sort(byDue) })
        return out.filter((g) => g.list.length)
    }, [rows, scope, lookups.staff])

    const toggle = async (t) => {
        const to = t.status === 5 ? 1 : 5
        setData((d) => ({ ...d, list: d.list.map((x) => (x.id === t.id ? { ...x, status: to } : x)) }))
        try { await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: to, ids: [t.id] } }) } catch (e) { notify('danger', e.message); load() }
    }
    const add = async () => {
        const name = quick.trim()
        if (!name) return
        setQuick('')
        try { await api('/api/crm/work/tasks', { method: 'POST', body: { name, assigneeIds: lookups.me ? [lookups.me] : [], status: 1, priority: 2 } }); notify('success', tr('Task added')); load() } catch (e) { notify('danger', e.message) }
    }
    const open = (id) => setDrawer({ open: true, id })
    const total = scope === 'mine' ? rows.filter((t) => t.status !== 5).length : rows.filter((t) => t.status !== 5).length
    const overdue = rows.filter((t) => isOverdue(t)).length

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3>{scope === 'mine' ? tr('My tasks') : tr('Team tasks')}</h3>
                    <p className="text-sm text-gray-500">{trn(total, 'open task')}{overdue > 0 && <span className="font-semibold text-red-500"> · {tr('{n} overdue', { n: overdue })}</span>}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Segment size="sm" value={scope} onChange={(v) => v && v !== scope && nav(v === 'mine' ? '/crm/my-tasks' : '/crm/team-tasks')}>
                        <Segment.Item value="mine">{tr('My tasks')}</Segment.Item>
                        <Segment.Item value="team">{tr('Team tasks')}</Segment.Item>
                    </Segment>
                    <Button size="sm" icon={<TbLayoutKanban />} onClick={() => nav('/crm/tasks-board')}>{tr('Board')}</Button>
                </div>
            </div>

            {data.can.create && (
                <div className="mb-4 flex gap-2">
                    <div className="flex-1"><Input prefix={<TbPlus className="text-lg" />} value={quick} placeholder={scope === 'mine' ? tr('Add a task for yourself and press Enter') : tr('Add a task and press Enter (it is assigned to you)')} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} /></div>
                    <Button variant="solid" disabled={!quick.trim()} onClick={add}>{tr('Add')}</Button>
                </div>
            )}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-72"><Input size="sm" value={search} prefix={<TbSearch className="text-lg" />} placeholder={tr('Search tasks')} onChange={(e) => setSearch(e.target.value)} /></div>
                {scope === 'team' && <label className="flex items-center gap-2 text-sm"><Switcher checked={showDone} onChange={setShowDone} />{tr('Show completed')}</label>}
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="flex flex-col gap-4">
                {groups.map((g) => (
                    <Section key={g.key} title={g.title} tone={g.tone} count={g.list.length} open={!closed[g.key]} onToggle={() => setClosed((c) => ({ ...c, [g.key]: !c[g.key] }))} icon={g.person ? <Avatar size={24} shape="circle" src={g.person.image || undefined}>{initials(g.person.name)}</Avatar> : null}>
                        {g.list.map((t) => <Row key={t.id} t={t} onOpen={open} onToggle={toggle} canEdit={data.can.edit} showAssignees={scope === 'mine' || g.key === 'none' ? scope === 'mine' : false} />)}
                    </Section>
                ))}
                {!loading && !groups.length && <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center text-gray-400 dark:border-gray-600">{scope === 'mine' ? tr('Nothing on your plate. 🎉') : tr('No task to show.')}</div>}
                {loading && !groups.length && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            </div>

            <TaskDrawer open={drawer.open} id={drawer.id} staff={lookups.staff} presets={null} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onChanged={load} />
        </Container>
    )
}

export default TaskList
