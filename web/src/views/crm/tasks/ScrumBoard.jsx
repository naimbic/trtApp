import { useCallback, useEffect, useMemo, useState } from 'react'
import StaffRing from '@/components/crm/StaffRing'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { TbPlus, TbPaperclip, TbMessageCircle, TbCalendar, TbExternalLink, TbList, TbChecklist, TbLoader, TbAlertTriangle, TbCircleCheck, TbUsers, TbChevronDown, TbChevronUp, TbHierarchy2 } from 'react-icons/tb'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import IconText from '@/components/shared/IconText'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import dayjs from 'dayjs'
import Avatar from '@/components/ui/Avatar'
import { api, notify } from '../kit/api'
import { DonutChart, TrendChart, PALETTE } from '../kit/charts'
import { StatCard, Panel } from '../kit/widgets'
import { STATUS, prioOf, statusOf, initials } from './shared'
import TasksBoard from './TasksBoard'
import { tr } from '@/utils/t'

const DAY = 86400000
const utcDay = (d) => new Date(d).toISOString().slice(0, 10)
const PRIO_NAME = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }

/** Everything the metric cards and charts show, worked out from the project's tasks. */
function insights(list) {
    const today = utcDay(Date.now())
    const open = list.filter((t) => t.status !== 5), done = list.filter((t) => t.status === 5)
    const overdue = open.filter((t) => t.dueDate && utcDay(t.dueDate) < today)
    const week = utcDay(Date.now() + 7 * DAY)
    const dueSoon = open.filter((t) => t.dueDate && utcDay(t.dueDate) >= today && utcDay(t.dueDate) <= week).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    const byStatus = {}, byPriority = {}
    for (const t of list) { const k = statusOf(t.status).label; byStatus[k] = (byStatus[k] || 0) + 1; const p = PRIO_NAME[t.priority] || 'Medium'; byPriority[p] = (byPriority[p] || 0) + 1 }
    const span = 21
    const labels = Array.from({ length: span }, (_, i) => utcDay(Date.now() - (span - 1 - i) * DAY))
    const scope = labels.map((l) => list.filter((t) => t.createdAt && utcDay(t.createdAt) <= l).length)
    const finished = labels.map((l) => done.filter((t) => t.dateFinished && utcDay(t.dateFinished) <= l).length)
    const days = done.filter((t) => t.dateFinished && t.createdAt).map((t) => Math.max(0, (new Date(t.dateFinished) - new Date(t.createdAt)) / DAY))
    const people = new Map()
    for (const t of list) for (const a of t.assignees) {
        const r = people.get(a.id) || { person: a, open: 0, overdue: 0, done: 0 }
        if (t.status === 5) r.done++; else { r.open++; if (t.dueDate && utcDay(t.dueDate) < today) r.overdue++ }
        people.set(a.id, r)
    }
    return {
        total: list.length, open: open.length, done: done.length, overdue, dueSoon, byStatus, byPriority, labels, scope, finished,
        rate: list.length ? Math.round((done.length / list.length) * 100) : 0,
        avgDays: days.length ? Math.round((days.reduce((x, y) => x + y, 0) / days.length) * 10) / 10 : null,
        unassigned: open.filter((t) => !t.assignees.length).length,
        workload: [...people.values()].sort((a, b) => b.open - a.open || b.done - a.done),
    }
}

/** One project's tasks as columns by status, in the template's scrum board look. */
const ScrumBoard = () => {
    const params = useParams()
    const nav = useNavigate()
    const [sp, setSp] = useSearchParams()
    const projectId = params.id || sp.get('project') || (() => { try { return localStorage.getItem('scrum.project') || '' } catch { return '' } })()
    const [projects, setProjects] = useState([])
    const [data, setData] = useState({ list: [], can: {} })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => { api('/api/crm/work/projects?limit=500').then((r) => setProjects(r.list || [])).catch(() => {}) }, [])
    const load = useCallback(async () => {
        if (!projectId) { setLoading(false); return }
        try { setData(await api(`/api/crm/work/tasks?relType=project&relId=${projectId}&limit=1000&done=1`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [projectId])
    useEffect(() => { setLoading(true); load() }, [load])

    const project = projects.find((p) => p.id === projectId)
    const m = useMemo(() => insights(data.list), [data.list])
    const [showInsights, setShowInsights] = useState(() => { try { return localStorage.getItem('scrum.insights') !== '0' } catch { return true } })
    const toggleInsights = () => setShowInsights((v) => { try { localStorage.setItem('scrum.insights', v ? '0' : '1') } catch { /* private mode */ } return !v })
    const maxLoad = Math.max(1, ...m.workload.map((w) => w.open + w.done))
    const left = project?.deadline ? Math.ceil((new Date(String(project.deadline).slice(0, 10)) - new Date(utcDay(Date.now()))) / DAY) : null
    const people = useMemo(() => { const m = new Map(); data.list.forEach((t) => t.assignees.forEach((a) => m.set(a.id, a))); return [...m.values()] }, [data.list])

    const choose = (id) => { try { localStorage.setItem('scrum.project', id || '') } catch { /* private mode */ } if (params.id) nav(`/crm/projects/${id}/board`); else setSp(id ? { project: id } : {}, { replace: true }) }
    return (
        <AdaptiveCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h3 className="truncate">{project?.name || tr('Scrum board')}</h3>
                    <p className="text-sm text-gray-500">{project ? tr('Scrum board') : tr('Pick a project to see its board')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {people.length > 0 && <UsersAvatarGroup className="flex items-center" avatarProps={{ size: 'sm' }} imgKey="image" users={people} />}
                    <div className="w-56"><Select size="sm" isClearable placeholder={tr('Project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} value={projects.filter((p) => p.id === projectId).map((p) => ({ value: p.id, label: p.name }))[0] || null} onChange={(o) => choose(o?.value || '')} /></div>
                    {projectId && <Button size="sm" icon={<TbList />} onClick={() => nav(`/crm/projects/${projectId}`)}>{tr('Project')}</Button>}
                    {projectId && <Button size="sm" icon={<TbExternalLink />} onClick={() => nav('/crm/my-tasks')}>{tr('Tasks')}</Button>}
                </div>
            </div>
            {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}


            {projectId && !loading && data.list.length > 0 && (
                <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-gray-50 px-5 py-3 dark:bg-gray-900">
                        {project?.client?.name && <div><div className="text-xs text-gray-500">{tr('Client')}</div><div className="font-semibold heading-text">{project.client.name}</div></div>}
                        {project && <div><div className="text-xs text-gray-500">{tr('Status')}</div><div className="font-semibold heading-text">{tr(project.statusLabel)}</div></div>}
                        {project?.deadline && <div><div className="text-xs text-gray-500">{tr('Deadline')}</div><div className={`font-semibold ${project.overdue ? 'text-red-500' : 'heading-text'}`}>{dayjs(project.deadline).format('DD MMM YYYY')}<span className="ms-1 text-xs font-normal text-gray-500">{left === null ? '' : left < 0 ? tr('{n} days late', { n: -left }) : left === 0 ? tr('today') : tr('{n} days left', { n: left })}</span></div></div>}
                        <div className="min-w-[200px] flex-1"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>{tr('Progress')}</span><b className="heading-text">{m.rate}%</b></div><div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${m.rate}%` }} /></div></div>
                        <button type="button" onClick={toggleInsights} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{showInsights ? <TbChevronUp /> : <TbChevronDown />}{showInsights ? tr('Hide charts') : tr('Show charts')}</button>
                    </div>
                    {showInsights && (
                        <>
                            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
                                <StatCard icon={<TbChecklist />} label={tr('Tasks')} value={m.total} sub={tr('{n} still open', { n: m.open })} tone="blue" />
                                <StatCard icon={<TbLoader />} label={tr('In progress')} value={m.byStatus[statusOf(4).label] || 0} sub={tr('{n} in testing or waiting', { n: (m.byStatus[statusOf(3).label] || 0) + (m.byStatus[statusOf(2).label] || 0) })} tone="violet" />
                                <StatCard icon={<TbAlertTriangle />} label={tr('Overdue')} value={m.overdue.length} sub={tr('{n} due this week', { n: m.dueSoon.length })} tone={m.overdue.length ? 'red' : 'green'} />
                                <StatCard icon={<TbCircleCheck />} label={tr('Completed')} value={`${m.rate}%`} sub={m.avgDays === null ? tr('{n} done', { n: m.done }) : tr('{n} done · {d} days on average', { n: m.done, d: m.avgDays })} tone="green" />
                                <StatCard icon={<TbUsers />} label={tr('Team')} value={m.workload.length} sub={tr('{n} tasks without an owner', { n: m.unassigned })} tone={m.unassigned ? 'amber' : 'teal'} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {!projectId ? (
                <div className="mt-8 rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-400 dark:border-gray-600">{tr('Choose a project above to open its scrum board.')}</div>
            ) : (
                <>
                <div className="mt-6">
                    <TasksBoard projectId={projectId} boardOnly onChanged={load} />
                </div>
                {!loading && data.list.length > 0 && showInsights && (
                            <div className="mt-6 grid gap-4 xl:grid-cols-3">
                                <Panel className="xl:col-span-2" title={tr('Who works on what')} subtitle={tr('Open and finished tasks per person')}>
                                    {m.workload.length ? (
                                        <div className="flex flex-col gap-3.5">
                                            {m.workload.map((w) => (
                                                <div key={w.person.id} className="flex items-center gap-3">
                                                    <StaffRing id={w.person.id} name={w.person.name} size={30}><Avatar size={30} shape="circle" src={w.person.image || undefined}>{initials(w.person.name)}</Avatar></StaffRing>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-1 flex items-center justify-between text-sm"><span className="truncate font-semibold">{w.person.name}</span><span className="text-xs text-gray-500">{tr('{n} open', { n: w.open })}{w.overdue > 0 && <b className="text-red-500"> · {tr('{n} overdue', { n: w.overdue })}</b>}<span className="text-emerald-600"> · {tr('{n} done', { n: w.done })}</span></span></div>
                                                        <div className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full bg-red-400" style={{ width: `${(w.overdue / maxLoad) * 100}%` }} /><div className="h-full bg-primary" style={{ width: `${((w.open - w.overdue) / maxLoad) * 100}%` }} /><div className="h-full bg-emerald-400" style={{ width: `${(w.done / maxLoad) * 100}%` }} /></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="py-6 text-center text-sm text-gray-400">{tr('No task assigned yet.')}</p>}
                                </Panel>
                                <Panel title={tr('Due soon')} subtitle={tr('Overdue first, then the next 7 days')}>
                                    {m.overdue.length + m.dueSoon.length ? (
                                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {[...m.overdue.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))), ...m.dueSoon].slice(0, 6).map((t) => (
                                                <li key={t.id} className="flex items-center gap-2 py-2"><button type="button" className="min-w-0 flex-1 text-start" onClick={() => nav(`/crm/tasks/${t.id}`)}><div className="truncate text-sm font-bold heading-text hover:text-primary">{t.name}</div><div className="truncate text-xs text-gray-500">{t.assignees.map((a) => a.name).join(', ') || tr('Unassigned')}</div></button><span className={`shrink-0 text-xs font-semibold ${utcDay(t.dueDate) < utcDay(Date.now()) ? 'text-red-500' : 'text-gray-500'}`}>{dayjs(t.dueDate).format('DD MMM')}</span></li>
                                            ))}
                                        </ul>
                                    ) : <p className="py-6 text-center text-sm text-gray-400">{tr('Nothing due in the next days. 🎉')}</p>}
                                </Panel>
                            </div>
                )}
                </>
            )}
        </AdaptiveCard>
    )
}

export default ScrumBoard
