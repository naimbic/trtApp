import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { TbChecklist, TbAlertTriangle, TbCalendarEvent, TbTargetArrow, TbBug, TbLifebuoy, TbPlus, TbCircleCheck, TbBulb, TbBell, TbClock, TbUsers, TbArrowRight } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Tag from '@/components/ui/Tag'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import classNames from '@/utils/classNames'
import { api, notify } from './kit/api'
import { DonutChart } from './kit/charts'
import { initials, prioOf, statusOf } from './tasks/shared'
import { tr, trn } from '@/utils/t'

dayjs.extend(relativeTime)
const TONES = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20', red: 'bg-red-100 text-red-600 dark:bg-red-500/20', amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20', violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20', teal: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20',
}
const PRIO_CLS = { low: 'bg-purple-200', medium: 'bg-orange-200', high: 'bg-red-200', critical: 'bg-red-300' }

const StatCard = ({ icon, label, value, sub, tone = 'blue', to }) => {
    const body = (
        <Card className="h-full" bodyClass="p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-sm text-gray-500">{label}</div><h3 className="mt-1">{value}</h3>{sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}</div>
                <div className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl', TONES[tone])}>{icon}</div>
            </div>
        </Card>
    )
    return to ? <Link to={to} className="block h-full">{body}</Link> : body
}

const Panel = ({ title, subtitle, action, className, children }) => (
    <Card className={className}>
        <div className="flex items-start justify-between gap-3"><div><h4>{title}</h4>{subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}</div>{action}</div>
        <div className="mt-4">{children}</div>
    </Card>
)
const Empty = ({ children }) => <div className="py-6 text-center text-sm text-gray-400">{children}</div>
const More = ({ to, children }) => <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{children}<TbArrowRight className="rtl:rotate-180" /></Link>
const greet = () => { const h = new Date().getHours(); return h < 12 ? tr('Good morning, {name}') : h < 18 ? tr('Good afternoon, {name}') : tr('Good evening, {name}') }

/** Home for the whole team: what I have to do today, who is doing what, what needs a follow-up. */
const TeamDashboard = () => {
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const load = useCallback(() => api('/api/crm/team-dashboard').then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [])
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
    const prioData = Object.fromEntries(Object.entries(issues?.byPriority || {}).map(([k, v]) => [prioLabel(k), v]))

    return (
        <Container>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <Avatar size={52} shape="circle" src={d.me.image || undefined}>{initials(d.me.name)}</Avatar>
                    <div><h3>{greet().replace('{name}', first)}</h3><p className="text-gray-500">{dayjs().format('dddd, DD MMMM YYYY')}{online?.length > 0 && <span> · {tr('{n} colleagues online', { n: online.length })}</span>}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {can.tasks && <Button size="sm" icon={<TbPlus />} onClick={() => nav('/crm/my-tasks')}>{tr('New task')}</Button>}
                    {can.leads && <Button size="sm" icon={<TbPlus />} onClick={() => nav('/crm/leads')}>{tr('New lead')}</Button>}
                    {can.issues && <Button size="sm" icon={<TbPlus />} onClick={() => nav('/crm/issues')}>{tr('New issue')}</Button>}
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {tasks && <StatCard icon={<TbChecklist />} label={tr('My open tasks')} value={tasks.mine.open} sub={tr('{n} done this week', { n: tasks.mine.doneWeek })} tone="blue" to="/crm/my-tasks" />}
                {tasks && <StatCard icon={<TbAlertTriangle />} label={tr('Overdue')} value={tasks.mine.overdue} sub={tr('{n} due today', { n: tasks.mine.today })} tone={tasks.mine.overdue ? 'red' : 'green'} to="/crm/my-tasks" />}
                {leads && <StatCard icon={<TbTargetArrow />} label={tr('My leads')} value={leads.mine.open} sub={tr('{n} to follow up', { n: leads.mine.stale })} tone="violet" to="/crm/leads" />}
                {issues && <StatCard icon={<TbBug />} label={tr('My issues')} value={issues.mineOpen} sub={tr('{n} critical in the team', { n: issues.critical })} tone="amber" to="/crm/issues" />}
                {tickets && <StatCard icon={<TbLifebuoy />} label={tr('Support tickets')} value={tickets.mine.length} sub={tr('{n} open in total', { n: tickets.open })} tone="teal" to="/crm/tickets" />}
                {agenda && <StatCard icon={<TbCalendarEvent />} label={tr('Today')} value={agenda.events.filter((e) => dayjs(e.start).isSame(dayjs(), 'day')).length} sub={tr('{n} reminders', { n: agenda.reminders.length })} tone="blue" to="/calendar" />}
            </div>

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
                                            <Avatar size={30} shape="circle" src={w.image || undefined}>{initials(w.name)}</Avatar>
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
                                        <Avatar size={28} shape="circle" src={a.staff?.image || undefined}>{a.staff ? initials(a.staff.name) : '·'}</Avatar>
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
