import { useCallback, useEffect, useState } from 'react'
import StaffRing from '@/components/crm/StaffRing'
import { Link, useNavigate } from 'react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { TbAdjustmentsHorizontal, TbUsersGroup, TbLayoutKanban, TbTimeline, TbUsers, TbFolders, TbCalendar, TbMessages, TbFileInvoice, TbFileDescription, TbReceipt, TbBook, TbFolder, TbKey, TbChartBar, TbDownload, TbFlag, TbTrophy, TbBolt, TbShieldCheck, TbTrendingUp, TbTrendingDown, TbHourglass, TbChecklist, TbAlertTriangle, TbCalendarEvent, TbTargetArrow, TbBug, TbLifebuoy, TbPlus, TbCircleCheck, TbBulb, TbBell, TbClock, TbArrowRight } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import { downloadCsv } from '@/utils/csv'
import Tag from '@/components/ui/Tag'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import classNames from '@/utils/classNames'
import { api, notify, useCan } from './kit/api'
import { DonutChart, TrendChart, ColumnChart, PALETTE } from './kit/charts'
import { TONES, StatCard, Panel } from './kit/widgets'
import { initials, prioOf, statusOf } from './tasks/shared'
import { tr, trn } from '@/utils/t'

dayjs.extend(relativeTime)
const PRIO_CLS = { low: 'bg-purple-200', medium: 'bg-orange-200', high: 'bg-red-200', critical: 'bg-red-300' }

const Empty = ({ children }) => <div className="py-6 text-center text-sm text-gray-400">{children}</div>
const More = ({ to, children }) => <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{children}<TbArrowRight className="rtl:rotate-180" /></Link>
const greet = () => { const h = new Date().getHours(); return h < 12 ? tr('Good morning, {name}') : h < 18 ? tr('Good afternoon, {name}') : tr('Good evening, {name}') }

/** Home for the whole team: what I have to do today, who is doing what, what needs a follow-up. */
const TeamDashboard = () => {
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [days, setDays] = useState(30)
    const load = useCallback(() => api(`/api/crm/team-dashboard?days=${days}`).then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [days])
    useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load() }, 60000); return () => clearInterval(t) }, [load])

    if (error && !d) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div></Container>
    if (!d) return <Container><div className="flex flex-col gap-4"><Skeleton height={40} width={320} /><div className="grid grid-cols-2 gap-4 lg:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={92} />)}</div><Skeleton height={320} /></div></Container>

    const { tasks, leads, issues, tickets, agenda, activity, online, can } = d
    const first = (d.me.name || '').split(' ')[0]
    const complete = async (t) => {
        try { await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: 5, ids: [t.id] } }); notify('success', tr('Task completed')); load() } catch (e) { notify('danger', e.message) }
    }
    // due dates are whole days (UTC midnight): compare the day, not the hour
    const when = (t) => { if (!t.dueDate) return ''; const day = String(t.dueDate).slice(0, 10), now = new Date().toISOString().slice(0, 10); return day < now ? tr('Overdue') : day === now ? tr('Today') : dayjs(day).format('DD MMM') }
    const maxLoad = Math.max(1, ...(tasks?.team?.workload || []).map((w) => w.open))
    const perf = d.performance
    const prioData = Object.fromEntries(Object.entries(issues?.byPriority || {}).map(([k, v]) => [prioLabel(k), v]))

    return (
        <Container>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <StaffRing id={d.me.id} name={d.me.name} size={52}><Avatar size={52} shape="circle" src={d.me.image || undefined}>{initials(d.me.name)}</Avatar></StaffRing>
                    <div><h3>{greet().replace('{name}', first)}</h3><p className="text-gray-500">{dayjs().format('dddd, DD MMMM YYYY')}{online?.length > 0 && <span> · {tr('{n} colleagues online', { n: online.length })}</span>}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {can.tasks && <Button size="sm" icon={<TbPlus />} onClick={() => nav('/crm/my-tasks')}>{tr('New task')}</Button>}
                    {can.leads && <Button size="sm" icon={<TbPlus />} onClick={() => nav('/crm/leads')}>{tr('New lead')}</Button>}
                    {can.issues && <Button size="sm" icon={<TbPlus />} onClick={() => nav('/crm/issues')}>{tr('New issue')}</Button>}
                </div>
            </div>

            <Shortcuts d={d} reload={load} />

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {tasks && <StatCard icon={<TbChecklist />} label={tr('My open tasks')} value={tasks.mine.open} sub={tr('{n} done this week', { n: tasks.mine.doneWeek })} tone="blue" to="/crm/my-tasks" />}
                {tasks && <StatCard icon={<TbAlertTriangle />} label={tr('Overdue')} value={tasks.mine.overdue} sub={tr('{n} due today', { n: tasks.mine.today })} tone={tasks.mine.overdue ? 'red' : 'green'} to="/crm/my-tasks" />}
                {leads && <StatCard icon={<TbTargetArrow />} label={tr('My leads')} value={leads.mine.open} sub={tr('{n} to follow up', { n: leads.mine.stale })} tone="violet" to="/crm/leads" />}
                {issues && <StatCard icon={<TbBug />} label={tr('My issues')} value={issues.mineOpen} sub={tr('{n} critical in the team', { n: issues.critical })} tone="amber" to="/crm/issues" />}
                {tickets && <StatCard icon={<TbLifebuoy />} label={tr('Support tickets')} value={tickets.mine.length} sub={tr('{n} open in total', { n: tickets.open })} tone="teal" to="/crm/tickets" />}
                {agenda && <StatCard icon={<TbCalendarEvent />} label={tr('Today')} value={agenda.events.filter((e) => dayjs(e.start).isSame(dayjs(), 'day')).length} sub={tr('{n} reminders', { n: agenda.reminders.length })} tone="blue" to="/calendar" />}
            </div>


            {perf && <Performance perf={perf} days={days} setDays={setDays} leadTrend={d.leadTrend} meId={d.me.id} reload={load} />}

            <div className="grid gap-4 xl:grid-cols-3">
                <div className="flex flex-col gap-4 xl:col-span-2">
                    {tasks && (
                        <Panel title={tr('My tasks')} subtitle={tr('Overdue first, then what is due soon')} action={<More to="/crm/my-tasks">{tr('All my tasks')}</More>}>
                            {tasks.mine.list.length ? (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {tasks.mine.list.map((t) => (
                                        <li key={t.id} className="flex items-center gap-3 py-2.5">
                                            <button type="button" className="text-2xl text-gray-300 hover:text-primary" title={tr('Complete')} onClick={() => complete(t)}><TbCircleCheck /></button>
                                            <Link to={`/crm/tasks/${t.id}`} className="min-w-0 flex-1"><div className="truncate font-bold heading-text hover:text-primary">{t.name}</div><div className="truncate text-xs text-gray-500">{[t.project, statusOf(t.status).label].filter(Boolean).join(' · ')}</div></Link>
                                            <Tag className={classNames('hidden sm:inline-flex', PRIO_CLS[['', 'low', 'medium', 'high', 'critical'][t.priority]], 'dark:text-gray-900')}>{prioOf(t.priority).label}</Tag>
                                            <span className={classNames('w-20 shrink-0 text-right text-xs font-semibold', when(t) === tr('Overdue') ? 'text-red-500' : 'text-gray-500')}>{when(t)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <Empty>{tr('Nothing on your plate. 🎉')}</Empty>}
                        </Panel>
                    )}

                    {leads && (
                        <Panel title={tr('Leads to follow up')} subtitle={tr('Your leads, the longest without contact first')} action={<More to="/crm/leads">{tr('All leads')}</More>}>
                            {leads.mine.list.length ? (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {leads.mine.list.map((l) => (
                                        <li key={l.id} className="flex items-center gap-3 py-2.5">
                                            <Link to={`/crm/leads/${l.id}`} className="min-w-0 flex-1"><div className="truncate font-bold heading-text hover:text-primary">{l.name}</div><div className="truncate text-xs text-gray-500">{l.company}</div></Link>
                                            {l.status && <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200">{l.status}</Tag>}
                                            <span className={classNames('inline-flex w-28 shrink-0 items-center justify-end gap-1 text-xs', l.days >= 7 ? 'font-semibold text-amber-600' : 'text-gray-500')}><TbClock />{l.contacted ? tr('{n} days ago', { n: l.days }) : tr('Not contacted')}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <Empty>{tr('No lead assigned to you right now.')}</Empty>}
                        </Panel>
                    )}

                    {tasks?.team && (
                        <Panel title={tr('Team workload')} subtitle={tr('{open} open tasks · {overdue} overdue · {unassigned} unassigned', { open: tasks.team.open, overdue: tasks.team.overdue, unassigned: tasks.team.unassigned })} action={<More to="/crm/team-tasks">{tr('Team tasks')}</More>}>
                            {tasks.team.workload.length ? (
                                <div className="flex flex-col gap-3.5">
                                    {tasks.team.workload.map((w) => (
                                        <div key={w.id} className="flex items-center gap-3">
                                            <StaffRing id={w.id} name={w.name} size={30}><Avatar size={30} shape="circle" src={w.image || undefined}>{initials(w.name)}</Avatar></StaffRing>
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex items-center justify-between text-sm"><span className="truncate font-semibold">{w.name}</span><span className="text-xs text-gray-500">{trn(w.open, 'open task')}{w.overdue > 0 && <b className="text-red-500"> · {tr('{n} overdue', { n: w.overdue })}</b>}{w.done > 0 && <span className="text-emerald-600"> · {tr('{n} done', { n: w.done })}</span>}</span></div>
                                                <div className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full bg-red-400" style={{ width: `${(w.overdue / maxLoad) * 100}%` }} /><div className="h-full bg-primary" style={{ width: `${((w.open - w.overdue) / maxLoad) * 100}%` }} /></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <Empty>{tr('No task assigned yet.')}</Empty>}
                        </Panel>
                    )}

                    {leads?.team && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <Panel title={tr('Leads pipeline')} subtitle={tr('{open} open · {new} new this week · {converted} converted this month', { open: leads.team.open, new: leads.team.newWeek, converted: leads.team.convertedMonth })}>
                                <DonutChart data={leads.team.byStatus} height={230} title={tr('Open leads')} />
                            </Panel>
                            <Panel title={tr('Leads by owner')} subtitle={tr('{n} without an owner', { n: leads.team.unassigned })}>
                                {leads.team.byOwner.length ? <ul className="divide-y divide-gray-100 dark:divide-gray-700">{leads.team.byOwner.map((o, i) => <li key={i} className="flex items-center gap-3 py-2.5 text-sm"><Avatar size={28} shape="circle" src={o.person?.image || undefined}>{o.person ? initials(o.person.name) : '?'}</Avatar><span className="flex-1 truncate font-semibold">{o.person?.name || tr('Unassigned')}</span><b>{o.n}</b></li>)}</ul> : <Empty>{tr('No lead yet.')}</Empty>}
                            </Panel>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    {agenda && (
                        <Panel title={tr('Agenda')} subtitle={tr('Events and reminders')} action={<More to="/calendar">{tr('Calendar')}</More>}>
                            {agenda.events.length + agenda.reminders.length ? (
                                <ul className="flex flex-col gap-3">
                                    {agenda.events.map((e) => <li key={e.id} className="flex items-start gap-3"><span className={classNames('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg', TONES.blue)}><TbCalendarEvent /></span><div className="min-w-0"><div className="truncate text-sm font-bold heading-text">{e.title}</div><div className="text-xs text-gray-500">{dayjs(e.start).format(dayjs(e.start).isSame(dayjs(), 'day') ? '[' + tr('Today') + '] HH:mm' : 'ddd DD MMM, HH:mm')}</div></div></li>)}
                                    {agenda.reminders.map((r) => <li key={r.id} className="flex items-start gap-3"><span className={classNames('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg', TONES.amber)}><TbBell /></span><div className="min-w-0"><div className="line-clamp-2 text-sm font-semibold">{r.text || tr('Reminder')}</div><div className="text-xs text-gray-500">{dayjs(r.date).format('ddd DD MMM, HH:mm')}</div></div></li>)}
                                </ul>
                            ) : <Empty>{tr('Nothing planned for the next days.')}</Empty>}
                        </Panel>
                    )}

                    {issues && (
                        <Panel title={tr('Issues and ideas')} subtitle={tr('{n} open on our platforms and websites', { n: issues.open })} action={<More to="/crm/issues">{tr('Issues')}</More>}>
                            {issues.open > 0 && <div className="mb-4 flex flex-wrap gap-1.5">{issues.byPlatform.map((p) => <span key={p.name} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{p.name} <b className="ml-1">{p.n}</b></span>)}</div>}
                            {issues.open > 0 && <DonutChart data={prioData} height={190} title={tr('Open')} />}
                            {issues.mine.length > 0 && <div className="mt-2"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{tr('Assigned to me')}</div><IssueList rows={issues.mine} /></div>}
                            <div className="mt-4"><div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400"><TbBulb />{tr('Ideas and requests')}</div>{issues.ideas.length ? <IssueList rows={issues.ideas} /> : <p className="py-3 text-sm text-gray-400">{tr('No idea waiting.')}</p>}</div>
                        </Panel>
                    )}

                    {tickets && tickets.mine.length > 0 && (
                        <Panel title={tr('My tickets')} subtitle={tr('{n} unassigned in the team', { n: tickets.unassigned })} action={<More to="/crm/tickets">{tr('Tickets')}</More>}>
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">{tickets.mine.map((t) => <li key={t.id} className="py-2.5"><Link to={`/crm/tickets/${t.id}`} className="block"><div className="truncate text-sm font-bold heading-text hover:text-primary">#{t.number} {t.subject}</div><div className="truncate text-xs text-gray-500">{t.client}{t.lastReply ? ` · ${dayjs(t.lastReply).fromNow()}` : ''}</div></Link></li>)}</ul>
                        </Panel>
                    )}

                    <Panel title={tr('Team activity')} subtitle={tr('The last 7 days')}>
                        {activity.length ? (
                            <ul className="flex flex-col gap-3.5">
                                {activity.map((a, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <StaffRing id={a.staff?.id} name={a.staff?.name} size={28}><Avatar size={28} shape="circle" src={a.staff?.image || undefined}>{a.staff ? initials(a.staff.name) : '·'}</Avatar></StaffRing>
                                        <div className="min-w-0 text-sm">
                                            <span className="font-semibold heading-text">{a.staff?.name || tr('Someone')}</span> <span className="text-gray-500">{{ comment: tr('commented on'), done: tr('completed'), lead: tr('added the lead'), issue: tr('commented on issue') }[a.type]}</span>{' '}
                                            {a.link ? <Link to={a.link} className="font-semibold text-primary hover:underline">{a.text}</Link> : <b>{a.text}</b>}
                                            <div className="text-xs text-gray-400">{dayjs(a.at).fromNow()}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : <Empty>{tr('No activity yet.')}</Empty>}
                    </Panel>

                    {online?.length > 0 && (
                        <Panel title={tr('Online now')} subtitle={tr('Colleagues using the CRM right now')} action={<TbUsers className="text-xl text-gray-400" />}>
                            <UsersAvatarGroup avatarProps={{ size: 34 }} imgKey="image" users={online} />
                        </Panel>
                    )}
                </div>
            </div>
        </Container>
    )
}


/* ---- shortcuts: the pages people use every day, one click from the dashboard ---- */
// feature = the permission needed to open the page (null: everybody); badge(d) = a live figure shown on the tile
const SHORTCUTS = [
    { key: 'my-tasks', label: () => tr('My tasks'), to: '/crm/my-tasks', icon: <TbChecklist />, tone: 'blue', feature: 'tasks', badge: (d) => d.tasks && { n: d.tasks.mine.open, warn: d.tasks.mine.overdue, text: d.tasks.mine.overdue ? tr('{n} overdue', { n: d.tasks.mine.overdue }) : tr('open') } },
    { key: 'today-tasks', label: () => tr('Tasks due today'), to: '/crm/my-tasks?period=today', icon: <TbCalendarEvent />, tone: 'amber', feature: 'tasks', badge: (d) => d.tasks && { n: d.tasks.mine.today, warn: 0, text: tr('due today') } },
    { key: 'leads', label: () => tr('Leads to follow up'), to: '/crm/leads', icon: <TbTargetArrow />, tone: 'violet', feature: 'leads', badge: (d) => d.leads && { n: d.leads.mine.stale, warn: d.leads.mine.stale, text: tr('to follow up') } },
    { key: 'team-tasks', label: () => tr('Team tasks'), to: '/crm/team-tasks', icon: <TbUsersGroup />, tone: 'teal', feature: 'tasks', badge: (d) => d.tasks?.team && { n: d.tasks.team.open, text: tr('open') } },
    { key: 'scrum-board', label: () => tr('Scrum board'), to: '/crm/scrum-board', icon: <TbLayoutKanban />, tone: 'green', feature: 'tasks' },
    { key: 'timeline', label: () => tr('Timeline'), to: '/crm/timeline', icon: <TbTimeline />, tone: 'amber', feature: 'tasks' },
    { key: 'time-report', label: () => tr('Time report'), to: '/crm/time-report', icon: <TbClock />, tone: 'blue', feature: 'tasks' },
    { key: 'tickets', label: () => tr('Support tickets'), to: '/crm/tickets', icon: <TbLifebuoy />, tone: 'teal', feature: 'tickets', badge: (d) => d.tickets && { n: d.tickets.mine.length, text: tr('mine') } },
    { key: 'issues', label: () => tr('Issues and ideas'), to: '/crm/issues', icon: <TbBug />, tone: 'amber', feature: 'issues', badge: (d) => d.issues && { n: d.issues.mineOpen, text: tr('mine') } },
    { key: 'projects', label: () => tr('Projects'), to: '/crm/projects', icon: <TbFolders />, tone: 'violet', feature: 'projects' },
    { key: 'clients', label: () => tr('Clients'), to: '/crm/clients', icon: <TbUsers />, tone: 'green', feature: 'customers' },
    { key: 'calendar', label: () => tr('Calendar'), to: '/calendar', icon: <TbCalendar />, tone: 'red', feature: null, badge: (d) => d.agenda && { n: d.agenda.events.filter((e) => dayjs(e.start).isSame(dayjs(), 'day')).length, text: tr('today') } },
    { key: 'chat', label: () => tr('Chat'), to: '/crm/chat', icon: <TbMessages />, tone: 'blue', feature: null },
    { key: 'notifications', label: () => tr('Notifications'), to: '/crm/notifications', icon: <TbBell />, tone: 'amber', feature: null },
    { key: 'invoices', label: () => tr('Invoices'), to: '/crm/invoices', icon: <TbFileInvoice />, tone: 'green', feature: 'invoices' },
    { key: 'estimates', label: () => tr('Estimates'), to: '/crm/estimates', icon: <TbFileDescription />, tone: 'violet', feature: 'estimates' },
    { key: 'expenses', label: () => tr('Expenses'), to: '/crm/expenses', icon: <TbReceipt />, tone: 'red', feature: 'expenses' },
    { key: 'kb', label: () => tr('Help center'), to: '/crm/knowledge-base', icon: <TbBook />, tone: 'teal', feature: 'knowledge_base' },
    { key: 'files', label: () => tr('File manager'), to: '/crm/file-manager', icon: <TbFolder />, tone: 'amber', feature: null },
    { key: 'passwords', label: () => tr('Password vault'), to: '/crm/passwords', icon: <TbKey />, tone: 'violet', feature: 'passwords' },
    { key: 'reports', label: () => tr('Reports'), to: '/crm/reports', icon: <TbChartBar />, tone: 'blue', feature: 'reports' },
]
const DEFAULT_SHORTCUTS = ['my-tasks', 'leads', 'team-tasks', 'scrum-board', 'tickets', 'calendar']

const Shortcuts = ({ d, reload }) => {
    const can = useCan()
    const [dlg, setDlg] = useState(null)
    const allowed = SHORTCUTS.filter((s) => !s.feature || can(s.feature, 'view') || can(s.feature, 'view_own'))
    const chosen = (d.shortcuts || DEFAULT_SHORTCUTS)
    const shown = allowed.filter((s) => chosen.includes(s.key))
    const save = async (body) => { try { await api('/api/crm/team-dashboard/shortcuts', { method: 'PUT', body }); setDlg(null); reload?.() } catch (e) { notify('danger', e.message) } }
    return (
        <div className="mb-6">
            <div className="mb-2 flex items-center justify-between"><h6 className="text-gray-500">{tr('Shortcuts')}</h6><button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" onClick={() => setDlg(allowed.filter((s) => chosen.includes(s.key)).map((s) => s.key))}><TbAdjustmentsHorizontal />{tr('Customize')}</button></div>
            {shown.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {shown.map((s) => {
                        const b = s.badge?.(d)
                        return (
                            <Link key={s.key} to={s.to} className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 transition hover:border-primary hover:shadow-md dark:border-gray-600 dark:bg-gray-800">
                                <span className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl', TONES[s.tone])}>{s.icon}</span>
                                <span className="min-w-0"><span className="block truncate text-sm font-bold heading-text group-hover:text-primary">{s.label()}</span>{b && <span className={classNames('block truncate text-xs', b.warn ? 'font-semibold text-red-500' : 'text-gray-500')}>{b.warn || b.text !== undefined ? `${b.n} · ${b.text}` : b.n}</span>}</span>
                            </Link>
                        )
                    })}
                </div>
            ) : <p className="text-sm text-gray-400">{tr('No shortcut yet. Use Customize to pin the pages you open most.')}</p>}
            <Dialog isOpen={!!dlg} width={520} onClose={() => setDlg(null)} onRequestClose={() => setDlg(null)}>
                <h5 className="mb-1">{tr('Your shortcuts')}</h5>
                <p className="mb-4 text-sm text-gray-500">{tr('Tick the pages you open every day. Only the pages you are allowed to open are listed.')}</p>
                {dlg && (
                    <>
                        <div className="grid max-h-[360px] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                            {allowed.map((s) => (
                                <label key={s.key} className={classNames('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2', dlg.includes(s.key) ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-600')}>
                                    <input type="checkbox" checked={dlg.includes(s.key)} onChange={() => setDlg((cur) => (cur.includes(s.key) ? cur.filter((x) => x !== s.key) : [...cur, s.key]))} />
                                    <span className={classNames('flex h-7 w-7 items-center justify-center rounded-lg text-lg', TONES[s.tone])}>{s.icon}</span>
                                    <span className="truncate text-sm font-semibold">{s.label()}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2">
                            <Button size="sm" variant="plain" onClick={() => save({ reset: true })}>{tr('Back to the default set')}</Button>
                            <div className="flex gap-2"><Button onClick={() => setDlg(null)}>{tr('Cancel')}</Button><Button variant="solid" onClick={() => save({ keys: dlg })}>{tr('Save')}</Button></div>
                        </div>
                    </>
                )}
            </Dialog>
        </div>
    )
}

const MEDAL = ['bg-amber-400 text-white', 'bg-slate-300 text-slate-700', 'bg-orange-300 text-white']
const delta = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : cur ? 100 : 0)
const Delta = ({ cur, prev, goodUp = true }) => {
    const p = delta(cur, prev)
    if (!p) return <span className="text-gray-400">{tr('same as before')}</span>
    const good = (p > 0) === goodUp
    return <span className={classNames('inline-flex items-center gap-0.5 font-semibold', good ? 'text-emerald-600' : 'text-red-500')}>{p > 0 ? <TbTrendingUp /> : <TbTrendingDown />}{Math.abs(p)}%</span>
}
const WEEKDAYS = () => [tr('Mon'), tr('Tue'), tr('Wed'), tr('Thu'), tr('Fri'), tr('Sat'), tr('Sun')]

const GoalBar = ({ label, value, target, percent, sub }) => {
    const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100)), reached = value >= target
    return (
        <div>
            <div className="mb-1 flex items-baseline justify-between text-sm"><span className="font-semibold">{label}</span><span className="text-gray-500"><b className={reached ? 'text-emerald-600' : 'heading-text'}>{value}{percent ? '%' : ''}</b> / {target}{percent ? '%' : ''}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className={classNames('h-full rounded-full transition-all', reached ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} /></div>
            {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
        </div>
    )
}

/** How the team is doing: trends, the people who stand out, and a leaderboard. Shown to whoever can see the tasks. */
const Performance = ({ perf, days, setDays, leadTrend, meId, reload }) => {
    const [goalDlg, setGoalDlg] = useState(null)
    const { team, me, leaderboard, badges, series, labels } = perf
    const vs = tr('vs previous {n} days', { n: days })
    const byId = Object.fromEntries(leaderboard.map((r) => [r.person.id, r]))
    const best = leaderboard[0]
    const maxScore = Math.max(1, ...leaderboard.map((r) => r.score))
    const BADGES = [
        ['top', tr('Best performer'), <TbTrophy />, 'amber', (r) => tr('{n} points', { n: r.score })],
        ['fastest', tr('Fastest'), <TbBolt />, 'blue', (r) => tr('{n} days on average', { n: r.avgDays })],
        ['reliable', tr('Most reliable'), <TbShieldCheck />, 'green', (r) => tr('{n}% on time', { n: r.onTimeRate })],
        ['closer', tr('Top closer'), <TbTargetArrow />, 'violet', (r) => tr('{n} leads converted', { n: r.converted })],
        ['active', tr('Most active'), <TbMessages />, 'teal', (r) => tr('{n} comments · {h} h tracked', { n: r.comments, h: r.hours })],
    ].filter(([k]) => badges[k] && byId[badges[k]])
    const periods = [7, 30, 90]
    const sparse = labels.length > 31
    const lbls = labels.map((l) => dayjs(l).format(sparse ? 'D MMM' : 'D'))
    return (
        <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div><h4>{tr('Team performance')}</h4><p className="text-sm text-gray-500">{tr('Who gets things done, how fast and how reliably')}</p></div>
                <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                    {periods.map((p) => <button key={p} type="button" onClick={() => setDays(p)} className={classNames('rounded-md px-3 py-1 text-sm font-semibold transition', days === p ? 'bg-white text-primary shadow-sm dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700')}>{tr('{n} days', { n: p })}</button>)}
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard icon={<TbCircleCheck />} label={tr('Tasks completed')} value={team.completed} change={{ cur: team.completed, prev: team.previous, label: vs }} sub={tr('{n} created', { n: team.created })} tone="green" />
                <StatCard icon={<TbShieldCheck />} label={tr('Finished on time')} value={team.onTimeRate === null ? '—' : `${team.onTimeRate}%`} change={team.onTimeRate !== null && team.previousOnTimeRate !== null ? { cur: team.onTimeRate, prev: team.previousOnTimeRate, label: vs } : undefined} sub={tr('of the tasks completed')} tone={team.onTimeRate !== null && team.onTimeRate < 70 ? 'amber' : 'blue'} />
                <StatCard icon={<TbBolt />} label={tr('Average time to finish')} value={team.avgDays === null ? '—' : tr('{n} days', { n: team.avgDays })} change={team.avgDays !== null && team.previousAvgDays !== null ? { cur: team.avgDays, prev: team.previousAvgDays, goodUp: false, label: vs } : undefined} sub={tr('from start to done')} tone="violet" />
                {team.backlog !== undefined
                    ? <StatCard icon={<TbHourglass />} label={tr('Backlog')} value={team.backlog} sub={tr('oldest open task: {n} days', { n: team.oldest })} tone={team.oldest > 60 ? 'amber' : 'teal'} to="/crm/team-tasks" />
                    : <StatCard icon={<TbTrophy />} label={tr('My rank')} value={me.rank ? `#${me.rank}` : '—'} sub={tr('{n} tasks completed', { n: me.completed })} tone="amber" />}
            </div>

            {(perf.goals?.weeklyTasks > 0 || perf.goals?.onTimeRate > 0 || perf.goals?.canSet) && (
                <Card className="mb-4" bodyClass="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-bold heading-text"><span className={classNames('flex h-7 w-7 items-center justify-center rounded-full text-lg', TONES.violet)}><TbFlag /></span>{tr('Goals this week')}</div>
                        {perf.goals.canSet && <Button size="xs" onClick={() => setGoalDlg({ weeklyTasks: perf.goals.weeklyTasks || '', onTimeRate: perf.goals.onTimeRate || '' })}>{tr('Set goals')}</Button>}
                    </div>
                    {perf.goals.weeklyTasks > 0 || perf.goals.onTimeRate > 0 ? (
                        <div className="grid gap-5 md:grid-cols-3">
                            {perf.goals.weeklyTasks > 0 && <GoalBar label={tr('My completed tasks')} value={perf.goals.week.me} target={perf.goals.weeklyTasks} />}
                            {perf.goals.weeklyTasks > 0 && perf.goals.week.team !== null && <GoalBar label={tr('Team completed tasks')} value={perf.goals.week.team} target={perf.goals.weeklyTasks * Math.max(1, perf.goals.week.members)} sub={tr('{n} per person', { n: perf.goals.weeklyTasks })} />}
                            {perf.goals.onTimeRate > 0 && <GoalBar label={tr('Finished on time')} value={me.onTimeRate ?? 0} target={perf.goals.onTimeRate} percent sub={tr('last {n} days', { n: days })} />}
                        </div>
                    ) : <p className="text-sm text-gray-500">{tr('No goals yet. Set a weekly target of completed tasks and a share finished on time so everybody sees how the week is going.')}</p>}
                </Card>
            )}
            <Dialog isOpen={!!goalDlg} width={400} onClose={() => setGoalDlg(null)} onRequestClose={() => setGoalDlg(null)}>
                <h5 className="mb-4">{tr('Team goals')}</h5>
                {goalDlg && (
                    <div className="space-y-3">
                        <div><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Completed tasks per person per week (0 = no goal)')}</div><Input type="number" min="0" value={goalDlg.weeklyTasks} onChange={(ev) => setGoalDlg({ ...goalDlg, weeklyTasks: ev.target.value })} /></div>
                        <div><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Finished on time, % (0 = no goal)')}</div><Input type="number" min="0" max="100" value={goalDlg.onTimeRate} onChange={(ev) => setGoalDlg({ ...goalDlg, onTimeRate: ev.target.value })} /></div>
                        <div className="flex justify-end gap-2 pt-2"><Button onClick={() => setGoalDlg(null)}>{tr('Cancel')}</Button><Button variant="solid" onClick={async () => { try { await api('/api/crm/team-dashboard', { method: 'PUT', body: goalDlg }); setGoalDlg(null); reload?.() } catch (er) { notify('danger', er.message) } }}>{tr('Save')}</Button></div>
                    </div>
                )}
            </Dialog>

            {BADGES.length > 0 && (
                <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {BADGES.map(([k, title, icon, tone, detail]) => {
                        const r = byId[badges[k]]
                        return (
                            <Card key={k} className="h-full" bodyClass="p-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><span className={classNames('flex h-6 w-6 items-center justify-center rounded-full text-base', TONES[tone])}>{icon}</span>{title}</div>
                                <div className="mt-3 flex items-center gap-3">
                                    <StaffRing id={r.person.id} name={r.person.name} size={40}><Avatar size={40} shape="circle" src={r.person.image || undefined}>{initials(r.person.name)}</Avatar></StaffRing>
                                    <div className="min-w-0"><div className="truncate font-bold heading-text">{r.person.name}</div><div className="truncate text-xs text-gray-500">{detail(r)}</div></div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            <div className="mb-4 grid gap-4 xl:grid-cols-3">
                <Panel className="xl:col-span-2" title={tr('Tasks created and completed')} subtitle={tr('Per day, the last {n} days', { n: days })}>
                    <TrendChart labels={lbls} height={280} colors={[PALETTE.green, PALETTE.blue]} series={[{ name: tr('Completed'), data: series.completed }, { name: tr('Created'), data: series.created }]} />
                </Panel>
                {perf.byStatus ? (
                    <Panel title={tr('Open tasks by status')} subtitle={tr('{n} still to do', { n: team.backlog })}>
                        <DonutChart data={perf.byStatus} height={270} title={tr('Open')} />
                    </Panel>
                ) : (
                    <Panel title={tr('My completed tasks')} subtitle={<span><Delta cur={me.completed} prev={me.previous} /> {tr('vs previous {n} days', { n: days })}</span>}>
                        <TrendChart type="area" labels={lbls} height={250} colors={[PALETTE.purple]} series={[{ name: tr('Completed'), data: series.mine }]} />
                    </Panel>
                )}
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-3">
                {leaderboard.length > 0 && (
                    <Panel className="xl:col-span-2" action={<Button size="xs" variant="plain" icon={<TbDownload />} onClick={() => downloadCsv(`team-performance-${days}d.csv`, [tr('Rank'), tr('Member'), tr('Tasks'), tr('On time'), tr('Avg. days'), tr('Hours'), tr('Comments'), tr('Issues'), tr('Leads converted'), tr('Score')], leaderboard.map((r, i) => [i + 1, r.person.name, r.completed, r.onTimeRate === null ? '' : `${r.onTimeRate}%`, r.avgDays ?? '', r.hours, r.comments, r.issues, r.converted, r.score]))}>{tr('Export CSV')}</Button>} title={tr('Leaderboard')} subtitle={tr('Points: 10 per task, +5 on time, +8 per issue resolved, +15 per lead converted, +1 per hour tracked (max 40)')}>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[620px] text-sm">
                                <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-400"><th className="pb-2 pe-2">#</th><th className="pb-2">{tr('Member')}</th><th className="pb-2 text-end">{tr('Tasks')}</th><th className="pb-2 text-end">{tr('On time')}</th><th className="pb-2 text-end">{tr('Avg. days')}</th><th className="pb-2 text-end">{tr('Hours')}</th><th className="pb-2 ps-4">{tr('Score')}</th></tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {leaderboard.map((r, i) => (
                                        <tr key={r.person.id} className={r.person.id === meId ? 'bg-primary/5' : ''}>
                                            <td className="py-2.5 pe-2"><span className={classNames('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold', MEDAL[i] || 'bg-gray-100 text-gray-500 dark:bg-gray-700')}>{i + 1}</span></td>
                                            <td className="py-2.5"><div className="flex items-center gap-2.5"><StaffRing id={r.person.id} name={r.person.name} size={28}><Avatar size={28} shape="circle" src={r.person.image || undefined}>{initials(r.person.name)}</Avatar></StaffRing><span className="truncate font-semibold">{r.person.name}</span></div></td>
                                            <td className="py-2.5 text-end font-bold">{r.completed}</td>
                                            <td className={classNames('py-2.5 text-end', r.onTimeRate !== null && r.onTimeRate < 60 ? 'text-red-500' : '')}>{r.onTimeRate === null ? '—' : `${r.onTimeRate}%`}</td>
                                            <td className="py-2.5 text-end">{r.avgDays === null ? '—' : r.avgDays}</td>
                                            <td className="py-2.5 text-end">{r.hours || '—'}</td>
                                            <td className="py-2.5 ps-4"><div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.score / maxScore) * 100}%` }} /></div><b className="w-9 text-end">{r.score}</b></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                )}
                <div className={classNames('flex flex-col gap-4', leaderboard.length ? '' : 'xl:col-span-3')}>
                    {best && leaderboard.length > 0 && me.rank && (
                        <Card bodyClass="p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tr('Your performance')}</div>
                            <div className="mt-2 flex items-end justify-between"><div className="text-3xl font-bold heading-text">#{me.rank}<span className="text-base font-semibold text-gray-400"> / {me.of}</span></div><div className="text-end text-sm text-gray-500">{tr('{n} points', { n: me.score })}</div></div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                                <div><b className="block text-lg heading-text">{me.completed}</b>{tr('Tasks')}</div>
                                <div><b className="block text-lg heading-text">{me.onTimeRate === null ? '—' : `${me.onTimeRate}%`}</b>{tr('On time')}</div>
                                <div><b className="block text-lg heading-text">{me.avgDays === null ? '—' : me.avgDays}</b>{tr('Avg. days')}</div>
                            </div>
                        </Card>
                    )}
                    <Panel title={tr('Busiest days')} subtitle={tr('When tasks get completed')}>
                        <ColumnChart labels={WEEKDAYS()} height={200} colors={[PALETTE.purple]} series={[{ name: tr('Completed'), data: perf.weekday }]} />
                    </Panel>
                </div>
            </div>

            {leadTrend && (leadTrend.created.some(Boolean) || leadTrend.converted.some(Boolean)) ? (
                <Panel title={tr('Leads per week')} subtitle={tr('New leads and conversions')}>
                    <ColumnChart labels={leadTrend.labels.map((l) => dayjs(l).format('D MMM'))} height={240} colors={[PALETTE.blue, PALETTE.green]} series={[{ name: tr('New leads'), data: leadTrend.created }, { name: tr('Converted'), data: leadTrend.converted }]} />
                </Panel>
            ) : null}
        </div>
    )
}

const prioLabel = (k) => prioOf({ low: 1, medium: 2, high: 3, critical: 4 }[k] || 2).label
const IssueList = ({ rows }) => (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {rows.map((i) => (
            <li key={i.id} className="flex items-center gap-2 py-2">
                <Link to={`/crm/issues/${i.id}`} className="min-w-0 flex-1"><div className="truncate text-sm font-bold heading-text hover:text-primary">#{i.number} {i.title}</div><div className="truncate text-xs text-gray-500">{i.platform || '—'}</div></Link>
                <Tag className={classNames(PRIO_CLS[i.priority], 'dark:text-gray-900')}>{prioLabel(i.priority)}</Tag>
            </li>
        ))}
    </ul>
)

export default TeamDashboard
