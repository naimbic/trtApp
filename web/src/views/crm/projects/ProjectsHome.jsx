import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ViewMode } from 'gantt-task-react'
import { TbProgressBolt, TbCopyCheck, TbArrowDownToArc, TbCircleCheck, TbCircleCheckFilled, TbCalendar, TbChecklist, TbFileText, TbBriefcase, TbFlag } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Loading from '@/components/shared/Loading'
import Chart from '@/components/shared/Chart'
import GanttChart from '@/components/shared/GanttChart'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Calendar from '@/components/ui/Calendar'
import Card from '@/components/ui/Card'
import ScrollBar from '@/components/ui/ScrollBar'
import Segment from '@/components/ui/Segment'
import Tag from '@/components/ui/Tag'
import Timeline from '@/components/ui/Timeline'
import { COLORS } from '@/constants/chart.constant'
import classNames from '@/utils/classNames'
import { api, notify, useCan } from '../kit/api'
import { initials } from '../tasks/shared'
import ProjectDialog from './ProjectDialog'
import { tr, savedLang } from '@/utils/t'
import { localTitle } from '../calendar/titles'

const labelClass = {
    Urgent: 'bg-red-200 dark:bg-red-200 dark:text-gray-900',
    High: 'bg-orange-200 dark:bg-orange-200 dark:text-gray-900',
    Medium: 'bg-sky-200 dark:bg-sky-200 dark:text-gray-900',
    Low: 'bg-purple-200 dark:bg-purple-200 dark:text-gray-900',
}
const GANTT_COLORS = { ongoing: '#38bdf8', hold: '#fbbf24', upcoming: '#a78bfa', milestone: '#6ee7b7' }
const EVENT_ICON = { events: [<TbCalendar key="e" />, 'bg-sky-200', tr("Event")], tasks: [<TbChecklist key="t" />, 'bg-emerald-200', tr("Task")], projects: [<TbBriefcase key="p" />, 'bg-purple-200', tr("Project deadline")], invoices: [<TbFileText key="i" />, 'bg-amber-200', tr("Invoice")], estimates: [<TbFileText key="s" />, 'bg-amber-200', tr("Estimate")], proposals: [<TbFileText key="r" />, 'bg-amber-200', tr("Proposal")], contracts: [<TbFlag key="c" />, 'bg-pink-200', tr("Contract")] }

const StatisticCard = ({ title, className, icon, value }) => (
    <div className={classNames('flex flex-col justify-center rounded-2xl p-4', className)}>
        <div className="relative flex items-center justify-between">
            <div><div className="mb-4 font-bold text-gray-900">{title}</div><h1 className="mb-1 text-gray-900">{value}</h1></div>
            <div className="flex max-h-12 min-h-12 min-w-12 max-w-12 items-center justify-center rounded-full bg-gray-900 text-2xl text-white">{icon}</div>
        </div>
    </div>
)

const Overview = ({ data, onCreate, canCreate }) => (
    <Card>
        <div className="flex items-center justify-between">
            <h4>{tr("Overview")}</h4>
            <div className="flex gap-2">
                {canCreate && <Button size="sm" variant="solid" onClick={onCreate}>{tr("Create project")}</Button>}
                <Link to="/crm/projects/list"><Button asElement="div" size="sm">{tr("All projects")}</Button></Link>
            </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl md:grid-cols-3">
            <StatisticCard title={tr("Ongoing project")} className="bg-sky-100 dark:bg-sky/75" value={data.ongoing} icon={<TbProgressBolt />} />
            <StatisticCard title={tr("Project completed")} className="bg-emerald-100 dark:bg-emerald/75" value={data.completed} icon={<TbCopyCheck />} />
            <StatisticCard title={tr("Upcoming project")} className="bg-purple-100 dark:bg-purple/75" value={data.upcoming} icon={<TbArrowDownToArc />} />
        </div>
        {(data.overdue > 0 || data.onHold > 0) && <p className="mt-3 text-sm text-gray-500">{data.overdue > 0 && <span className="mr-4 font-semibold text-red-500">{data.overdue} {tr("past deadline")}</span>}{data.onHold > 0 && <span>{data.onHold} {tr("on hold")}</span>}</p>}
    </Card>
)

const Schedule = ({ data }) => {
    const nav = useNavigate()
    const [tasks, setTasks] = useState(data)
    const [mode, setMode] = useState(ViewMode.Month)
    useEffect(() => setTasks(data), [data])
    return (
        <Card>
            <div className="flex items-center justify-between gap-4"><h4>{tr("Schedule")}</h4>
                <Segment size="sm" value={mode} onChange={(v) => setMode(v)}><Segment.Item value={ViewMode.Week}>{tr("Week")}</Segment.Item><Segment.Item value={ViewMode.Month}>{tr("Month")}</Segment.Item></Segment>
            </div>
            <div className="mt-4">
                {tasks.length ? <GanttChart locale={savedLang()} tasks={tasks} viewMode={mode} colorsMap={GANTT_COLORS} columnWidth={mode === ViewMode.Month ? 90 : 65} onExpanderClick={(t) => setTasks((l) => l.map((x) => (x.id === t.id ? t : x)))} onDoubleClick={(t) => t.link && nav(t.link)} onDateChange={() => false} onProgressChange={() => false} /> : <p className="py-10 text-center text-gray-500">{tr("No active projects with dates. Start one to see it here.")}</p>}
            </div>
        </Card>
    )
}

const Upcoming = () => {
    const nav = useNavigate()
    const [date, setDate] = useState(dayjs().toDate())
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        let live = true
        setLoading(true)
        api(`/api/crm/calendar?from=${dayjs(date).startOf('day').toISOString()}&to=${dayjs(date).endOf('day').toISOString()}`).then((r) => { if (live) setItems(Array.isArray(r) ? r : r.items || r.list || []) }).catch(() => live && setItems([])).finally(() => live && setLoading(false))
        return () => { live = false }
    }, [date])
    const sorted = useMemo(() => [...items].sort((a, b) => String(a.start).localeCompare(String(b.start))), [items])
    const today = dayjs(date).isSame(dayjs(), 'day')
    return (
        <Card>
            <div className="flex flex-col md:flex-row md:gap-10 xl:flex-col xl:gap-0">
                <div className="mx-auto flex w-[280px] items-center"><Calendar value={date} onChange={setDate} /></div>
                <div className="w-full">
                    <div className="my-6"><h5>{tr("Schedule")} {today ? tr("today") : dayjs(date).format('DD MMM')}</h5></div>
                    <ScrollBar className="h-[280px] overflow-y-auto xl:max-w-[280px]">
                        <Loading loading={loading}>
                            <div className="flex flex-col gap-4">
                                {sorted.map((e) => {
                                    const [icon, color, label] = EVENT_ICON[e.type] || EVENT_ICON.events
                                    return (
                                        <div key={e.id} className="flex cursor-pointer items-center justify-between gap-4 py-1" onClick={() => nav('/calendar')}>
                                            <div className="flex min-w-0 items-center gap-3"><Avatar className={classNames('text-gray-900', color)} icon={icon} shape="round" /><div className="min-w-0"><div className="heading-text truncate font-bold">{localTitle(e.title)}</div><div className="font-normal">{label}</div></div></div>
                                            <div className="shrink-0 text-right">{!e.allDay && String(e.start).length > 10 ? <><span className="heading-text font-semibold">{dayjs(e.start).format('hh:mm')} </span><small>{dayjs(e.start).format('A')}</small></> : <small>{tr("All day")}</small>}</div>
                                        </div>
                                    )
                                })}
                                {!sorted.length && !loading && <p className="text-sm text-gray-500">{tr("Nothing planned for this day.")}</p>}
                            </div>
                        </Loading>
                    </ScrollBar>
                </div>
            </div>
            <div className="mt-4"><Button block variant="solid" onClick={() => nav('/calendar')}>{tr("Open the calendar")}</Button></div>
        </Card>
    )
}

const CurrentTasks = ({ data }) => {
    const [tasks, setTasks] = useState(data)
    useEffect(() => setTasks(data), [data])
    const done = async (t) => {
        setTasks((l) => l.map((x) => (x.id === t.id ? { ...x, checked: true } : x)))
        try { await api(`/api/crm/work/tasks/${t.id}/move`, { method: 'POST', body: { status: 5 } }); notify('success', tr("Task completed")); setTimeout(() => setTasks((l) => l.filter((x) => x.id !== t.id)), 600) } catch (e) { notify('danger', e.message); setTasks((l) => l.map((x) => (x.id === t.id ? { ...x, checked: false } : x))) }
    }
    return (
        <Card>
            <div className="flex items-center justify-between"><h4>{tr("Current tasks")}</h4><Link to="/crm/tasks-board"><Button asElement="div" size="sm">{tr("All tasks")}</Button></Link></div>
            <div className="mt-4">
                {tasks.map((t, i) => (
                    <div key={t.id} className={classNames('flex items-center justify-between gap-2 border-gray-200 py-4 dark:border-gray-600', i < tasks.length - 1 && 'border-b')}>
                        <div className="flex min-w-0 items-center gap-4">
                            <button className="cursor-pointer text-[26px]" onClick={() => !t.checked && done(t)}>{t.checked ? <TbCircleCheckFilled className="text-primary" /> : <TbCircleCheck className="hover:text-primary" />}</button>
                            <div className="min-w-0">
                                <Link to={t.projectId ? `/crm/projects/${t.projectId}` : `/crm/tasks-board?task=${t.id}`} className={classNames('heading-text mb-1 block truncate font-bold hover:text-primary', t.checked && 'line-through opacity-50')}>{t.name}</Link>
                                <div className={classNames('flex items-center gap-1 text-sm', t.overdue && 'font-semibold text-red-500')}><TbCalendar className="text-lg" />{t.dueDate ? dayjs(t.dueDate).format('MMMM DD') : '-'}</div>
                            </div>
                        </div>
                        {t.priority && <Tag className={`mr-2 shrink-0 ${labelClass[t.priority] || ''}`}>{tr(t.priority)}</Tag>}
                    </div>
                ))}
                {!tasks.length && <p className="py-6 text-center text-gray-500">{tr("You have no open tasks. 🎉")}</p>}
            </div>
        </Card>
    )
}

const Legend = ({ label, value, color }) => (
    <div className="flex gap-2">{color && <Badge className="mt-2.5" style={{ backgroundColor: color }} />}<div><h5 className="font-bold">{value}</h5><p>{label}</p></div></div>
)
const TaskOverview = ({ data }) => {
    const [range, setRange] = useState('weekly')
    const d = data[range]
    const sum = (a) => a.reduce((n, x) => n + x, 0)
    return (
        <Card>
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row md:items-center"><h4>{tr("Task overview")}</h4>
                <Segment value={range} size="sm" onChange={(v) => setRange(v)}><Segment.Item value="daily">{tr("Daily")}</Segment.Item><Segment.Item value="weekly">{tr("Weekly")}</Segment.Item></Segment>
            </div>
            <div className="mb-4 flex items-center justify-between">
                <Legend label={tr("Open tasks")} value={data.open} />
                <div className="flex gap-x-6"><Legend color={COLORS[7]} label={tr("New")} value={sum(d.created)} /><Legend color={COLORS[8]} label={tr("Finished")} value={sum(d.finished)} /></div>
            </div>
            <Chart series={[{ name: 'New', data: d.created }, { name: 'Finished', data: d.finished }]} xAxis={d.range} type="bar" customOptions={{ colors: [COLORS[7], COLORS[8]], legend: { show: false }, plotOptions: { bar: { columnWidth: '15px', borderRadius: 4, borderRadiusApplication: 'end' } } }} />
        </Card>
    )
}

const RecentActivity = ({ data }) => (
    <Card>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row md:items-center"><h4>{tr("Recent activity")}</h4></div>
        <ScrollBar className="max-h-[390px]">
            <Timeline>
                {data.length ? data.map((a) => (
                    <Timeline.Item key={a.id} media={<Avatar size={30} shape="circle" src={a.image || undefined}>{initials(a.by)}</Avatar>}>
                        <div className="mt-1 text-sm"><span className="heading-text font-bold">{a.by}</span> <span>{a.text}</span><div><Link to={`/crm/projects/${a.projectId}`} className="text-xs text-primary hover:underline">{a.project}</Link><span className="text-xs text-gray-400"> · {dayjs(a.date).format('DD MMM, HH:mm')}</span></div></div>
                    </Timeline.Item>
                )) : <Timeline.Item>{tr("No activities")}</Timeline.Item>}
            </Timeline>
        </ScrollBar>
    </Card>
)

const ProjectsHome = () => {
    const nav = useNavigate()
    const can = useCan()
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [dialog, setDialog] = useState(false)
    const load = useCallback(async () => { try { setData(await api('/api/crm/work/projects/dashboard')) } catch (e) { setError(e.message) } }, [])
    useEffect(() => { load() }, [load])
    return (
        <Container>
            <Loading loading={!data && !error}>
                {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                {data && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 xl:flex-row">
                            <div className="flex flex-1 flex-col gap-4 xl:max-w-[calc(100%-350px)]">
                                <Overview data={data.overview} canCreate={data.can.create && can('projects', 'create')} onCreate={() => setDialog(true)} />
                                <Schedule data={data.schedule} />
                            </div>
                            <div><Upcoming /></div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="order-1 md:col-span-1"><CurrentTasks data={data.currentTasks} /></div>
                            <div className="order-2 md:col-span-1 xl:order-3"><RecentActivity data={data.recentActivity} /></div>
                            <div className="order-3 md:col-span-2 xl:order-2 xl:col-span-1"><TaskOverview data={data.taskOverview} /></div>
                        </div>
                    </div>
                )}
            </Loading>
            <ProjectDialog open={dialog} onClose={() => setDialog(false)} onCreated={(id) => nav(`/crm/projects/${id}`)} />
        </Container>
    )
}

export default ProjectsHome
