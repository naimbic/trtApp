import { useEffect, useMemo, useRef, useState } from 'react'
import StaffRing from '@/components/crm/StaffRing'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { TbChevronDown, TbAlertTriangle } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import classNames from '@/utils/classNames'
import { api } from '../kit/api'
import { STATUS, statusOf, initials, useTaskStatuses } from './shared'
import { tr } from '@/utils/t'

const DAY = 86400000
const utc = (d) => Date.UTC(new Date(d).getUTCFullYear(), new Date(d).getUTCMonth(), new Date(d).getUTCDate())
const LEFT = 260
const ROW = 30

/**
 * Tasks on a calendar, grouped like the project accordions: one fold per project (name, progress, dates, late tasks; its span as a thin bar
 * while closed), and inside, one bar per task from its start to its due date. One scroll area: the task names stay on the left, the dates on top.
 */
const Timeline = () => {
    useTaskStatuses()
    const nav = useNavigate()
    const [projects, setProjects] = useState([])
    const [projectId, setProjectId] = useState('')
    const [zoom, setZoom] = useState('days')
    const [hideDone, setHideDone] = useState(false)
    const [tasks, setTasks] = useState(null)
    const [error, setError] = useState('')
    const [shut, setShut] = useState({}) // folds the person closed
    const box = useRef(null)
    const w = zoom === 'days' ? 30 : 11

    useEffect(() => { api('/api/crm/work/projects?limit=500').then((r) => setProjects(r.list || [])).catch(() => {}) }, [])
    useEffect(() => {
        setTasks(null)
        api(`/api/crm/work/tasks?limit=1000&done=1${projectId ? `&relType=project&relId=${projectId}` : ''}`).then((r) => { setTasks(r.list || []); setError('') }).catch((e) => setError(e.message))
    }, [projectId])

    const model = useMemo(() => {
        const today = utc(Date.now())
        const all = (tasks || []).filter((t) => t.startDate || t.dueDate)
        const dated = hideDone ? all.filter((t) => t.status !== 5) : all
        if (!dated.length) return { all, dated, groups: [], from: today, days: 0, today }
        const starts = dated.map((t) => utc(t.startDate || t.dueDate)), ends = dated.map((t) => utc(t.dueDate || t.startDate))
        const from = Math.max(Math.min(today - 7 * DAY, ...starts), today - 90 * DAY)
        const to = Math.min(Math.max(today + 28 * DAY, ...ends), today + 240 * DAY)
        const byProject = {}
        for (const t of dated) (byProject[t.rel?.type === 'project' ? t.rel.label : tr('No project')] ||= []).push(t)
        const groups = Object.entries(byProject).sort((a, b) => a[0].localeCompare(b[0])).map(([name, list]) => {
            const ids = new Set(list.map((t) => t.id))
            const top = list.filter((t) => !t.parentId || !ids.has(t.parentId)).sort((a, b) => utc(a.startDate || a.dueDate) - utc(b.startDate || b.dueDate))
            const rows = []
            for (const t of top) { rows.push({ t, depth: 0 }); for (const c of list.filter((x) => x.parentId === t.id)) rows.push({ t: c, depth: 1 }) }
            const s = Math.min(...list.map((t) => utc(t.startDate || t.dueDate))), e = Math.max(...list.map((t) => utc(t.dueDate || t.startDate)))
            const done = list.filter((t) => t.status === 5).length
            const late = list.filter((t) => t.status !== 5 && t.dueDate && utc(t.dueDate) < today).length
            return { name, rows, count: list.length, done, late, s, e }
        })
        return { all, dated, groups, from, days: Math.round((to - from) / DAY) + 1, today }
    }, [tasks, hideDone])

    useEffect(() => { if (box.current && model.days) box.current.scrollLeft = Math.max(0, ((model.today - model.from) / DAY - 5) * w) }, [model.days, model.from, model.today, w])

    const months = []
    for (let i = 0; i < model.days; i++) { const d = dayjs(model.from + i * DAY); const key = d.format('YYYY-MM'); if (!months.length || months[months.length - 1].key !== key) months.push({ key, label: d.format('MMMM YYYY'), days: 0 }); months[months.length - 1].days++ }
    const width = model.days * w
    const todayX = ((model.today - model.from) / DAY) * w
    const x = (t) => ((t - model.from) / DAY) * w
    const allShut = model.groups.length > 0 && model.groups.every((g) => shut[g.name])
    const grid = { backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: `${w}px 100%` }

    return (
        <Container>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div><h3>{tr('Timeline')}</h3><p className="text-sm text-gray-500">{tr('Every task from its start to its due date')}</p></div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-56"><Select size="sm" isClearable placeholder={tr('All projects')} options={projects.map((p) => ({ value: p.id, label: p.name }))} value={projects.filter((p) => p.id === projectId).map((p) => ({ value: p.id, label: p.name }))[0] || null} onChange={(o) => setProjectId(o?.value || '')} /></div>
                    <label className="flex items-center gap-2 text-sm"><Switcher checked={hideDone} onChange={setHideDone} />{tr('Hide completed')}</label>
                    <Segment size="sm" value={zoom} onChange={(v) => v && setZoom(v)}><Segment.Item value="days">{tr('Days')}</Segment.Item><Segment.Item value="weeks">{tr('Weeks')}</Segment.Item></Segment>
                    {model.groups.length > 1 && <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setShut(allShut ? {} : Object.fromEntries(model.groups.map((g) => [g.name, true])))}>{allShut ? tr('Expand all') : tr('Collapse all')}</button>}
                </div>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            {!tasks && !error && <div className="py-20 text-center text-gray-400">{tr('Loading…')}</div>}
            {tasks && !model.groups.length && <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-400 dark:border-gray-600">{tr('No task with a start or due date yet.')}</div>}
            {model.groups.length > 0 && (
                <>
                    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {STATUS.filter((st) => st.active).map((st) => <span key={st.value} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: st.color }} />{st.label}</span>)}
                        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" />{tr('Overdue')}</span>
                    </div>
                    <div ref={box} className="max-h-[calc(100vh-250px)] min-h-[260px] overflow-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                        <div className="relative" style={{ width: LEFT + width, minWidth: '100%' }}>
                            {/* dates: stay on top while the page scrolls */}
                            <div className="sticky top-0 z-30 flex h-[46px] border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                <div className="sticky left-0 z-40 flex shrink-0 items-end border-r border-gray-200 bg-gray-50 px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-700 dark:bg-gray-900" style={{ width: LEFT }}>{tr('Task')}</div>
                                <div style={{ width }}>
                                    <div className="flex h-[22px]">{months.map((m) => <div key={m.key} className="truncate border-s border-gray-200 px-2 text-xs font-semibold text-gray-500 first:border-s-0 dark:border-gray-700" style={{ width: m.days * w }}>{m.days * w > 70 ? m.label : ''}</div>)}</div>
                                    <div className="flex h-6">{Array.from({ length: model.days }, (_, i) => { const d = dayjs(model.from + i * DAY); const wk = d.day() === 0 || d.day() === 6; return <div key={i} className={classNames('shrink-0 text-center text-[10px] leading-6', wk ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' : 'text-gray-500', d.valueOf() === model.today && 'font-bold text-red-500')} style={{ width: w }}>{zoom === 'days' || d.day() === 1 ? d.format(zoom === 'days' ? 'D' : 'D') : ''}</div> })}</div>
                                </div>
                            </div>
                            {todayX >= 0 && <div className="pointer-events-none absolute bottom-0 top-[46px] z-10 w-px bg-red-400" style={{ left: LEFT + todayX + w / 2 }} />}
                            {model.groups.map((g) => {
                                const closed = !!shut[g.name]
                                const pct = g.count ? Math.round((g.done / g.count) * 100) : 0
                                return (
                                    <div key={g.name} className="border-b border-gray-200 last:border-b-0 dark:border-gray-700">
                                        <div className="flex bg-gray-50/70 dark:bg-gray-900/60" style={{ height: 34 }}>
                                            <button type="button" aria-expanded={!closed} onClick={() => setShut((s) => ({ ...s, [g.name]: !s[g.name] }))} className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-gray-200 bg-gray-50 px-3 text-start hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800" style={{ width: LEFT }}>
                                                <TbChevronDown className={classNames('shrink-0 text-gray-400 transition-transform', closed && '-rotate-90')} />
                                                <span className="min-w-0 flex-1 truncate text-sm font-bold heading-text">{g.name}</span>
                                                {g.late > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 text-[11px] font-bold text-red-600 dark:bg-red-500/15" title={tr('Overdue')}><TbAlertTriangle />{g.late}</span>}
                                                <span className="rounded-full bg-white px-1.5 text-[11px] font-bold tabular-nums text-gray-500 dark:bg-gray-800" title={tr('{n} tasks', { n: g.count })}>{g.done}/{g.count}</span>
                                            </button>
                                            <div className="relative" style={{ width, ...grid }}>
                                                <div className="absolute top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-gray-300/70 dark:bg-gray-600/60" style={{ left: x(g.s), width: Math.max(w, x(g.e) - x(g.s) + w) }} title={`${dayjs(g.s).format('D MMM')} → ${dayjs(g.e).format('D MMM')} · ${pct}%`}>
                                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        {!closed && g.rows.map((r) => {
                                            const s = utc(r.t.startDate || r.t.dueDate), e = utc(r.t.dueDate || r.t.startDate)
                                            const left = x(s), wd = Math.max(w, ((Math.max(e, s) - s) / DAY + 1) * w)
                                            const late = r.t.status !== 5 && r.t.dueDate && e < model.today
                                            return (
                                                <div key={r.t.id} className="flex border-t border-gray-100 dark:border-gray-700/60" style={{ height: ROW }}>
                                                    <button type="button" data-href={`/crm/tasks/${r.t.id}`} onClick={() => nav(`/crm/tasks/${r.t.id}`)} className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-gray-200 bg-white px-3 text-start text-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700" style={{ width: LEFT, paddingInlineStart: r.depth ? 30 : 12 }}>
                                                        {r.t.assignees[0] ? <StaffRing id={r.t.assignees[0].id} name={r.t.assignees[0].name} size={18}><Avatar size={18} shape="circle" src={r.t.assignees[0].image || undefined}>{initials(r.t.assignees[0].name)}</Avatar></StaffRing> : <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-gray-200 dark:bg-gray-600" />}
                                                        <span className={classNames('truncate', r.t.status === 5 && 'text-gray-400 line-through')}>{r.t.name}</span>
                                                    </button>
                                                    <div className="relative" style={{ width, ...grid }}>
                                                        <button type="button" title={`${r.t.name} · ${dayjs(s).format('D MMM')} → ${dayjs(e).format('D MMM')}`} data-href={`/crm/tasks/${r.t.id}`} onClick={() => nav(`/crm/tasks/${r.t.id}`)} className="absolute top-1/2 h-4 -translate-y-1/2 rounded-md shadow-sm transition hover:brightness-110" style={{ left, width: wd, background: late ? '#ef4444' : statusOf(r.t.status).color }} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    {(tasks.length - model.all.length) > 0 && <p className="mt-2 text-xs text-gray-400">{tr('{n} tasks without dates are not shown.', { n: tasks.length - model.all.length })}</p>}
                </>
            )}
        </Container>
    )
}

export default Timeline
