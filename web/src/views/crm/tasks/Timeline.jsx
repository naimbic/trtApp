import { useEffect, useMemo, useRef, useState } from 'react'
import StaffRing from '@/components/crm/StaffRing'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Avatar from '@/components/ui/Avatar'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import classNames from '@/utils/classNames'
import { api } from '../kit/api'
import { statusOf, initials } from './shared'
import { tr } from '@/utils/t'

const DAY = 86400000
const utc = (d) => Date.UTC(new Date(d).getUTCFullYear(), new Date(d).getUTCMonth(), new Date(d).getUTCDate())
const BAR = { 1: 'bg-slate-400', 4: 'bg-blue-500', 3: 'bg-purple-500', 2: 'bg-amber-500', 5: 'bg-emerald-500' }
const LEFT = 270

/** Tasks on a calendar: one bar per task from its start to its due date, grouped by project, with today marked. */
const Timeline = () => {
    const nav = useNavigate()
    const [projects, setProjects] = useState([])
    const [projectId, setProjectId] = useState('')
    const [zoom, setZoom] = useState('days')
    const [tasks, setTasks] = useState(null)
    const [error, setError] = useState('')
    const box = useRef(null)
    const w = zoom === 'days' ? 30 : 11

    useEffect(() => { api('/api/crm/work/projects?limit=500').then((r) => setProjects(r.list || [])).catch(() => {}) }, [])
    useEffect(() => {
        setTasks(null)
        api(`/api/crm/work/tasks?limit=1000&done=1${projectId ? `&relType=project&relId=${projectId}` : ''}`).then((r) => { setTasks(r.list || []); setError('') }).catch((e) => setError(e.message))
    }, [projectId])

    const model = useMemo(() => {
        const dated = (tasks || []).filter((t) => t.startDate || t.dueDate)
        const today = utc(Date.now())
        if (!dated.length) return { dated, rows: [], from: today, days: 0, today }
        const starts = dated.map((t) => utc(t.startDate || t.dueDate)), ends = dated.map((t) => utc(t.dueDate || t.startDate))
        const from = Math.max(Math.min(today - 7 * DAY, ...starts), today - 90 * DAY)
        const to = Math.min(Math.max(today + 28 * DAY, ...ends), today + 240 * DAY)
        const byProject = {}
        for (const t of dated) (byProject[t.rel?.type === 'project' ? t.rel.label : tr('No project')] ||= []).push(t)
        const rows = []
        for (const [name, list] of Object.entries(byProject).sort((a, b) => a[0].localeCompare(b[0]))) {
            rows.push({ head: name, count: list.length })
            const ids = new Set(list.map((t) => t.id))
            const top = list.filter((t) => !t.parentId || !ids.has(t.parentId)).sort((a, b) => utc(a.startDate || a.dueDate) - utc(b.startDate || b.dueDate))
            for (const t of top) { rows.push({ t, depth: 0 }); for (const c of list.filter((x) => x.parentId === t.id)) rows.push({ t: c, depth: 1 }) }
        }
        return { dated, rows, from, days: Math.round((to - from) / DAY) + 1, today }
    }, [tasks])

    useEffect(() => { if (box.current && model.days) box.current.scrollLeft = Math.max(0, ((model.today - model.from) / DAY - 5) * w) }, [model.days, model.from, model.today, w])

    const months = []
    for (let i = 0; i < model.days; i++) { const d = dayjs(model.from + i * DAY).utc ? dayjs(model.from + i * DAY) : dayjs(model.from + i * DAY); const key = d.format('YYYY-MM'); if (!months.length || months[months.length - 1].key !== key) months.push({ key, label: d.format('MMMM YYYY'), start: i, n: 0 }); months[months.length - 1].n++ }
    const width = model.days * w
    const todayX = ((model.today - model.from) / DAY) * w

    return (
        <AdaptiveCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h3>{tr('Timeline')}</h3><p className="text-sm text-gray-500">{tr('Every task from its start to its due date')}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="w-56"><Select size="sm" isClearable placeholder={tr('All projects')} options={projects.map((p) => ({ value: p.id, label: p.name }))} value={projects.filter((p) => p.id === projectId).map((p) => ({ value: p.id, label: p.name }))[0] || null} onChange={(o) => setProjectId(o?.value || '')} /></div>
                    <Segment size="sm" value={zoom} onChange={(v) => v && setZoom(v)}><Segment.Item value="days">{tr('Days')}</Segment.Item><Segment.Item value="weeks">{tr('Weeks')}</Segment.Item></Segment>
                </div>
            </div>
            {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            {!tasks && !error && <div className="py-20 text-center text-gray-400">{tr('Loading…')}</div>}
            {tasks && !model.rows.length && <div className="mt-8 rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-400 dark:border-gray-600">{tr('No task with a start or due date yet.')}</div>}
            {model.rows.length > 0 && (
                <>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                        {[1, 4, 3, 2, 5].map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className={classNames('h-2.5 w-2.5 rounded-sm', BAR[s])} />{statusOf(s).label}</span>)}
                        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" />{tr('Overdue')}</span>
                    </div>
                    <div className="mt-3 flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="shrink-0 border-r border-gray-200 dark:border-gray-700" style={{ width: LEFT }}>
                            <div className="h-[52px] border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-700 dark:bg-gray-900">{tr('Task')}</div>
                            {model.rows.map((r, i) => r.head ? (
                                <div key={i} className="flex h-9 items-center justify-between bg-gray-50 px-3 text-sm font-bold dark:bg-gray-900"><span className="truncate">{r.head}</span><span className="text-xs font-normal text-gray-400">{r.count}</span></div>
                            ) : (
                                <button key={i} type="button" onClick={() => nav(`/crm/tasks/${r.t.id}`)} className="flex h-9 w-full items-center gap-2 px-3 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-800" style={{ paddingInlineStart: 12 + r.depth * 16 }}>
                                    {r.t.assignees[0] ? <StaffRing id={r.t.assignees[0].id} name={r.t.assignees[0].name} size={20}><Avatar size={20} shape="circle" src={r.t.assignees[0].image || undefined}>{initials(r.t.assignees[0].name)}</Avatar></StaffRing> : <span className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-700" />}
                                    <span className={classNames('truncate', r.t.status === 5 && 'text-gray-400 line-through')}>{r.t.name}</span>
                                </button>
                            ))}
                        </div>
                        <div ref={box} className="min-w-0 flex-1 overflow-x-auto">
                            <div className="relative" style={{ width }}>
                                <div className="h-[52px] border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                    <div className="flex h-6">{months.map((m) => <div key={m.key} className="truncate border-s border-gray-200 px-2 text-xs font-semibold text-gray-500 first:border-s-0 dark:border-gray-700" style={{ width: m.n * w }}>{m.label}</div>)}</div>
                                    <div className="flex h-[26px]">{Array.from({ length: model.days }, (_, i) => { const d = dayjs(model.from + i * DAY); const wk = d.day() === 0 || d.day() === 6; return <div key={i} className={classNames('shrink-0 text-center text-[10px] leading-[26px]', wk ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' : 'text-gray-500')} style={{ width: w }}>{zoom === 'days' ? d.format('D') : d.date() === 1 || d.day() === 1 ? d.format('D') : ''}</div> })}</div>
                                </div>
                                {todayX >= 0 && <div className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-red-400" style={{ left: todayX + w / 2 }} />}
                                {model.rows.map((r, i) => {
                                    if (r.head) return <div key={i} className="h-9 bg-gray-50 dark:bg-gray-900" />
                                    const s = utc(r.t.startDate || r.t.dueDate), e = utc(r.t.dueDate || r.t.startDate)
                                    const left = ((s - model.from) / DAY) * w, wd = Math.max(w, ((Math.max(e, s) - s) / DAY + 1) * w)
                                    const late = r.t.status !== 5 && r.t.dueDate && e < model.today
                                    return (
                                        <div key={i} className="relative h-9 border-b border-gray-100 dark:border-gray-800" style={{ backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: `${w}px 100%` }}>
                                            <button type="button" title={`${r.t.name} · ${dayjs(s).format('D MMM')} → ${dayjs(e).format('D MMM')}`} onClick={() => nav(`/crm/tasks/${r.t.id}`)} className={classNames('absolute top-2 h-5 overflow-hidden rounded-md px-1.5 text-start text-[11px] font-semibold leading-5 text-white shadow-sm hover:brightness-110', late ? 'bg-red-500' : BAR[r.t.status])} style={{ left, width: wd }}>{wd > 70 ? r.t.name : ''}</button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    {(tasks.length - model.dated.length) > 0 && <p className="mt-2 text-xs text-gray-400">{tr('{n} tasks without dates are not shown.', { n: tasks.length - model.dated.length })}</p>}
                </>
            )}
        </AdaptiveCard>
    )
}

export default Timeline
