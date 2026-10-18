import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import { TbDownload, TbClock, TbReceipt, TbListDetails, TbSunHigh } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import { downloadCsv } from '@/utils/csv'
import classNames from '@/utils/classNames'
import { api } from '../kit/api'
import { DonutChart, TrendChart, PALETTE } from '../kit/charts'
import { StatCard, Panel } from '../kit/widgets'
import { initials } from './shared'
import { tr } from '@/utils/t'

const fmt = (h) => { const m = Math.round(h * 60); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}` : `${m} min` }

/** Time logged on tasks: per day, per project and per person, and the latest entries. */
const TimeReport = () => {
    const [days, setDays] = useState(30)
    const [staffId, setStaffId] = useState('')
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const load = useCallback(() => api(`/api/crm/work/time-report?days=${days}${staffId ? `&staffId=${staffId}` : ''}`).then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [days, staffId])
    useEffect(() => { load() }, [load])

    if (error && !d) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div></Container>
    if (!d) return <Container><div className="flex flex-col gap-4"><Skeleton height={40} width={280} /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={92} />)}</div><Skeleton height={300} /></div></Container>
    const vs = tr('vs previous {n} days', { n: d.days })
    const sparse = d.labels.length > 31
    const max = Math.max(1, ...d.people.map((p) => p.hours))

    return (
        <Container>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr('Time report')}</h3><p className="text-gray-500">{d.all ? tr('Time logged on tasks by the team') : tr('Time you logged on tasks')}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                    {d.all && d.staff.length > 0 && <div className="w-52"><Select size="sm" isClearable placeholder={tr('Everyone')} options={d.staff.map((s) => ({ value: s.id, label: s.name }))} value={d.staff.filter((s) => s.id === staffId).map((s) => ({ value: s.id, label: s.name }))[0] || null} onChange={(o) => setStaffId(o?.value || '')} /></div>}
                    <Button size="sm" icon={<TbDownload />} disabled={!d.recent.length} onClick={() => downloadCsv(`time-report-${d.days}d.csv`, [tr('Task'), tr('Project'), tr('Member'), tr('Date'), tr('Hours'), tr('Note')], d.recent.map((r) => [r.task?.name || '', r.project || '', r.person?.name || '', dayjs(r.at).format('YYYY-MM-DD HH:mm'), r.hours, r.note]))}>{tr('Export CSV')}</Button>
                    <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                        {[7, 30, 90].map((p) => <button key={p} type="button" onClick={() => setDays(p)} className={classNames('rounded-md px-3 py-1 text-sm font-semibold transition', days === p ? 'bg-white text-primary shadow-sm dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700')}>{tr('{n} days', { n: p })}</button>)}
                    </div>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={<TbClock />} label={tr('Time logged')} value={fmt(d.total)} change={{ cur: d.total, prev: d.previous.total, label: vs }} sub={tr('in the last {n} days', { n: d.days })} tone="blue" />
                <StatCard icon={<TbReceipt />} label={tr('Billable')} value={fmt(d.billable)} change={{ cur: d.billable, prev: d.previous.billable, label: vs }} sub={d.total ? tr('{n}% of the time', { n: Math.round((d.billable / d.total) * 100) }) : '—'} tone="green" />
                <StatCard icon={<TbListDetails />} label={tr('Entries')} value={d.entries} change={{ cur: d.entries, prev: d.previous.entries, label: vs }} sub={tr('timer sessions')} tone="violet" />
                <StatCard icon={<TbSunHigh />} label={tr('Per working day')} value={fmt(d.average)} change={{ cur: d.average, prev: d.previous.average, label: vs }} sub={tr('days with time logged')} tone="amber" />
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-3">
                <Panel className="xl:col-span-2" title={tr('Hours per day')} subtitle={tr('Time logged, last {n} days', { n: d.days })}>
                    <TrendChart labels={d.labels.map((l) => dayjs(l).format(sparse ? 'D MMM' : 'D'))} height={260} colors={[PALETTE.blue]} series={[{ name: tr('Hours'), data: d.perDay }]} />
                </Panel>
                <Panel title={tr('By project')} subtitle={tr('Hours')}>
                    <DonutChart data={d.projects} height={260} title={tr('Hours')} />
                </Panel>
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-3">
                {d.all && (
                    <Panel title={tr('By person')} subtitle={tr('Hours and tasks worked on')}>
                        {d.people.length ? (
                            <div className="flex flex-col gap-3.5">
                                {d.people.map((p) => (
                                    <div key={p.person.id} className="flex items-center gap-3">
                                        <Avatar size={30} shape="circle" src={p.person.image || undefined}>{initials(p.person.name)}</Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center justify-between text-sm"><span className="truncate font-semibold">{p.person.name}</span><span className="text-xs text-gray-500"><b className="text-gray-700 dark:text-gray-200">{fmt(p.hours)}</b> · {tr('{n} tasks', { n: p.tasks })}</span></div>
                                            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-primary" style={{ width: `${(p.hours / max) * 100}%` }} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="py-6 text-center text-sm text-gray-400">{tr('No time logged yet.')}</p>}
                    </Panel>
                )}
                <Panel className={d.all ? 'xl:col-span-2' : 'xl:col-span-3'} title={tr('Latest entries')} subtitle={tr('The most recent timer sessions')}>
                    {d.recent.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[520px] text-sm">
                                <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-400"><th className="pb-2">{tr('Task')}</th>{d.all && <th className="pb-2">{tr('Member')}</th>}<th className="pb-2">{tr('Date')}</th><th className="pb-2 text-end">{tr('Time')}</th></tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {d.recent.map((r) => (
                                        <tr key={r.id}>
                                            <td className="max-w-[260px] py-2.5">{r.task ? <Link to={`/crm/tasks/${r.task.id}`} className="block truncate font-semibold heading-text hover:text-primary">{r.task.name}</Link> : <span className="text-gray-400">—</span>}<div className="truncate text-xs text-gray-500">{[r.project, r.note].filter(Boolean).join(' · ')}</div></td>
                                            {d.all && <td className="py-2.5">{r.person?.name || '—'}</td>}
                                            <td className="py-2.5 text-gray-500">{dayjs(r.at).format('DD MMM, HH:mm')}</td>
                                            <td className="py-2.5 text-end font-bold">{fmt(r.hours)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="py-6 text-center text-sm text-gray-400">{tr('No time logged yet.')}</p>}
                </Panel>
            </div>
        </Container>
    )
}

export default TimeReport
