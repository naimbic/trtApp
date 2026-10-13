import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import Card from '@/components/ui/Card'
import Segment from '@/components/ui/Segment'
import Skeleton from '@/components/ui/Skeleton'
import Chart from '@/components/shared/Chart'
import {
    PiReceiptDuotone,
    PiUserSwitchDuotone,
    PiKanbanDuotone,
    PiCheckSquareDuotone,
} from 'react-icons/pi'

// Layout modelled on the Perfex CRM admin dashboard:
//   quick stats (count / total + progress) → finance overview (invoices, estimates, proposals)
//   → payment statistics + leads overview → projects / tasks / tickets overview → recent lists.

const nf = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nfi = (v) => Number(v || 0).toLocaleString('en-US')
const compact = (v) => Number(v || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const monthLabel = (m) => dayjs(`${m}-01`).format('MMM YYYY')

// Perfex colour set
const C = { success: '#84c529', info: '#03a9f4', warning: '#ff6f00', danger: '#fc2d42', muted: '#9ca3af', primary: '#2563eb', purple: '#8b5cf6' }
const STATUS_COLOR = {
    // invoices
    Draft: C.muted, 'Not sent': '#64748b', Unpaid: C.danger, 'Partially paid': C.info, Overdue: C.warning, Paid: C.success,
    // estimates / proposals
    Sent: C.info, Declined: C.danger, Accepted: C.success, Expired: C.warning, Open: C.info, Revised: C.warning,
    // projects / tasks / tickets / leads
    'Not started': C.muted, 'In progress': C.info, 'On hold': C.warning, Cancelled: C.danger, Finished: C.success,
    'Awaiting feedback': C.warning, Testing: C.purple, Complete: C.success, Closed: C.success, Answered: C.info,
    New: C.muted, Contacted: C.info, Qualified: C.success, 'Proposal sent': C.purple, Negotiation: C.warning,
}
const FALLBACK = [C.info, C.success, C.warning, C.danger, C.purple, C.muted]
const colorFor = (name, i = 0) => STATUS_COLOR[name] || FALLBACK[i % FALLBACK.length]

const Line = ({ pct, color, height = 6 }) => (
    <div className="w-full rounded-full bg-gray-200/70 dark:bg-gray-600/50 overflow-hidden" style={{ height }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }} />
    </div>
)

/** Top row: "Invoices Awaiting Payment   3 / 10" with a progress bar and percentage. */
const QuickStat = ({ icon, label, value, total, color, to }) => {
    const pct = total ? (value / total) * 100 : 0
    const body = (
        <Card className="h-full" bodyClass="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
                <span className="flex items-center gap-2 font-medium min-w-0">
                    <span className="text-xl shrink-0" style={{ color }}>{icon}</span>
                    <span className="leading-tight">{label}</span>
                </span>
                <span className="font-semibold shrink-0">{nfi(value)} / {nfi(total)}</span>
            </div>
            <Line pct={pct} color={color} />
            <div className="text-right text-xs text-gray-500 mt-1.5">{Math.round(pct)}%</div>
        </Card>
    )
    return to ? <Link to={to}>{body}</Link> : body
}

const Empty = ({ children = 'No data yet' }) => <div className="text-sm text-gray-400 py-6 text-center">{children}</div>

/** "Invoices Overview" style box: one `Status  n / total` row with a coloured progress line per status. */
const Overview = ({ title, order, counts, total, to, footer }) => {
    const names = order || Object.keys(counts || {})
    const sum = total ?? names.reduce((s, n) => s + (counts?.[n] || 0), 0)
    return (
        <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
                <h5>{title}</h5>
                {to && <Link className="text-sm text-primary hover:underline" to={to}>View all</Link>}
            </div>
            {sum ? (
                <ul className="flex flex-col gap-3.5">
                    {names.map((n, i) => {
                        const v = counts?.[n] || 0
                        return (
                            <li key={n}>
                                <div className="flex items-center justify-between text-sm mb-1.5">
                                    <span style={{ color: colorFor(n, i) }} className="font-medium">{n}</span>
                                    <span className="text-gray-600 dark:text-gray-300">{nfi(v)} / {nfi(sum)}</span>
                                </div>
                                <Line pct={sum ? (v / sum) * 100 : 0} color={colorFor(n, i)} />
                            </li>
                        )
                    })}
                </ul>
            ) : (
                <Empty />
            )}
            {footer}
        </Card>
    )
}

const List = ({ rows, empty, render }) =>
    rows?.length ? (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map((r) => (
                <li key={r.id || r.clientId + r.currencyId} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    {render(r)}
                </li>
            ))}
        </ul>
    ) : (
        <Empty>{empty}</Empty>
    )

const ListCard = ({ title, to, children, className = '' }) => (
    <Card className={className}>
        <div className="flex items-center justify-between mb-2">
            <h5>{title}</h5>
            {to && <Link className="text-sm text-primary hover:underline" to={to}>View all</Link>}
        </div>
        {children}
    </Card>
)

const Dashboard = () => {
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [currencyId, setCurrencyId] = useState(null)

    useEffect(() => {
        fetch('/api/crm/dashboard', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Dashboard failed (${r.status})`))))
            .then((d) => {
                setData(d)
                const used = Object.keys(d.invoices?.byCurrency || {})
                const def = d.currencies.find((c) => c.isDefault && used.includes(c.id)) || d.currencies.find((c) => used.includes(c.id))
                setCurrencyId(def?.id || used[0] || null)
            })
            .catch((e) => setError(e.message))
    }, [])

    const cur = useMemo(() => data?.currencies.find((c) => c.id === currencyId), [data, currencyId])
    const money = (v, id = currencyId) => {
        const c = data?.currencies.find((x) => x.id === id) || cur
        const s = c?.symbol || c?.name || ''
        return c?.placement === 'after' ? `${nf(v)} ${s}` : `${s ? s + ' ' : ''}${nf(v)}`
    }

    if (error) return <Card>Could not load the dashboard: {error}</Card>
    if (!data) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton height={28} width={220} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={96} />)}
                </div>
                <Skeleton height={300} />
            </div>
        )
    }

    const inv = data.invoices?.byCurrency?.[currencyId]
    const usedCurrencies = data.currencies.filter((c) => data.invoices?.byCurrency?.[c.id])
    const months = data.months
    const labels = months.map(monthLabel)
    const collected = inv ? months.map((m) => inv.collectedByMonth[m] || 0) : []
    const sumCounts = (o) => Object.values(o || {}).reduce((s, n) => s + n, 0)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3>Dashboard</h3>
                {usedCurrencies.length > 1 && (
                    <Segment value={currencyId} size="sm" onChange={(v) => setCurrencyId(v)}>
                        {usedCurrencies.map((c) => (
                            <Segment.Item key={c.id} value={c.id}>{c.name}</Segment.Item>
                        ))}
                    </Segment>
                )}
            </div>

            {/* quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.invoices && <QuickStat icon={<PiReceiptDuotone />} label="Invoices Awaiting Payment" value={data.invoices.awaiting} total={data.invoices.activeInvoices} color={C.success} to="/crm/invoices" />}
                {data.leads && <QuickStat icon={<PiUserSwitchDuotone />} label="Converted Leads" value={data.leads.converted} total={data.leads.total} color={C.info} to="/crm/leads" />}
                {data.projects && <QuickStat icon={<PiKanbanDuotone />} label="Projects In Progress" value={data.projects.byStatus?.['In progress'] || 0} total={data.projects.total} color={C.warning} to="/crm/projects" />}
                {data.tasks && <QuickStat icon={<PiCheckSquareDuotone />} label="Tasks Not Finished" value={data.tasks.open} total={data.tasks.total} color={C.danger} to="/crm/tasks" />}
            </div>

            {/* finance overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {data.invoices && (
                    <Overview
                        title="Invoices Overview"
                        to="/crm/invoices"
                        order={['Draft', 'Not sent', 'Unpaid', 'Partially paid', 'Overdue', 'Paid']}
                        counts={data.invoices.statusCounts}
                        total={data.invoices.activeInvoices}
                        footer={
                            inv && (
                                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2 text-sm">
                                    <div><div className="text-gray-500 text-xs">Outstanding</div><b>{money(inv.outstanding)}</b></div>
                                    <div><div className="text-gray-500 text-xs">Past due</div><b style={{ color: C.warning }}>{money(inv.overdue)}</b></div>
                                    <div><div className="text-gray-500 text-xs">Paid</div><b style={{ color: C.success }}>{money(inv.paid)}</b></div>
                                </div>
                            )
                        }
                    />
                )}
                {data.estimates && <Overview title="Estimates Overview" to="/crm/estimates" order={['Draft', 'Sent', 'Declined', 'Accepted', 'Expired']} counts={data.estimates.byStatus} total={data.estimates.total} />}
                {data.proposals && <Overview title="Proposals Overview" to="/crm/proposals" order={['Draft', 'Sent', 'Open', 'Revised', 'Declined', 'Accepted']} counts={data.proposals.byStatus} total={data.proposals.total} />}
            </div>

            {/* payment statistics + leads overview */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {inv && (
                    <Card className="xl:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h5>Payment Statistics</h5>
                            <span className="text-sm text-gray-500">Last 12 months · {cur?.name}</span>
                        </div>
                        <Chart
                            type="bar"
                            height={320}
                            series={[{ name: 'Payments', data: collected }]}
                            xAxis={labels}
                            customOptions={{
                                colors: [C.info],
                                chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                                plotOptions: { bar: { columnWidth: '55%', borderRadius: 2 } },
                                dataLabels: { enabled: false },
                                grid: { borderColor: 'rgba(148,163,184,0.25)', strokeDashArray: 3 },
                                legend: { show: false },
                                xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: -45, rotateAlways: true, style: { colors: '#94a3b8', fontSize: '11px' } } },
                                yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '12px' }, formatter: (v) => compact(v) } },
                                tooltip: { y: { formatter: (v) => money(v) } },
                            }}
                        />
                    </Card>
                )}
                {data.leads && <Overview title="Leads Overview" to="/crm/leads" counts={data.leads.byStatus} total={sumCounts(data.leads.byStatus)} />}
            </div>

            {/* work / support overviews */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {data.projects && <Overview title="Projects Overview" to="/crm/projects" order={['Not started', 'In progress', 'On hold', 'Cancelled', 'Finished']} counts={data.projects.byStatus} total={data.projects.total} />}
                {data.tasks && <Overview title="Tasks Overview" to="/crm/tasks" order={['Not started', 'In progress', 'Testing', 'Awaiting feedback', 'Complete']} counts={data.tasks.byStatus} total={data.tasks.total} />}
                {data.tickets && <Overview title="Tickets Overview" to="/crm/tickets" counts={data.tickets.byStatus} total={data.tickets.total} />}
            </div>

            {/* recent lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.invoices && (
                    <ListCard title="Overdue Invoices" to="/crm/invoices">
                        <List
                            rows={data.invoices.overdueList}
                            empty="Nothing overdue"
                            render={(i) => (
                                <>
                                    <div className="min-w-0">
                                        <Link className="font-medium hover:underline" to={`/crm/invoices/${i.id}`}>{i.number}</Link>
                                        <div className="text-xs text-gray-500 truncate">{i.company} · due {dayjs(i.dueDate).format('YYYY-MM-DD')}</div>
                                    </div>
                                    <span className="font-semibold shrink-0" style={{ color: C.danger }}>{money(i.due, i.currencyId)}</span>
                                </>
                            )}
                        />
                    </ListCard>
                )}
                {data.recent && (
                    <ListCard title="Latest Payments" to="/crm/payments">
                        <List
                            rows={data.recent.payments}
                            empty="No payments yet"
                            render={(p) => (
                                <>
                                    <div className="min-w-0">
                                        <Link className="font-medium hover:underline" to={`/crm/invoices/${p.invoiceId}`}>{p.invoiceNumber || 'Payment'}</Link>
                                        <div className="text-xs text-gray-500">{p.date ? dayjs(p.date).format('YYYY-MM-DD') : ''}</div>
                                    </div>
                                    <span className="font-semibold shrink-0" style={{ color: C.success }}>{money(p.amount, p.currencyId)}</span>
                                </>
                            )}
                        />
                    </ListCard>
                )}
                {data.invoices && (
                    <ListCard title="Top Clients">
                        <List
                            rows={data.invoices.topClients.filter((c) => (c.currencyId || 'none') === (currencyId || 'none'))}
                            empty="No invoices yet"
                            render={(c) => (
                                <>
                                    <Link className="truncate hover:underline" to={`/crm/clients/${c.clientId}`}>{c.company}</Link>
                                    <span className="font-semibold shrink-0">{money(c.total, c.currencyId)}</span>
                                </>
                            )}
                        />
                    </ListCard>
                )}
                {data.tasks && (
                    <ListCard title="Tasks Due This Week" to="/crm/tasks">
                        <List
                            rows={data.tasks.upcoming}
                            empty="No tasks due in the next 7 days"
                            render={(t) => (
                                <>
                                    <span className="truncate">{t.name}</span>
                                    <span className="text-xs text-gray-500 shrink-0">{dayjs(t.dueDate).format('MMM D')} · {t.status}</span>
                                </>
                            )}
                        />
                    </ListCard>
                )}
                {data.recent && (
                    <ListCard title="Recent Activity" className="xl:col-span-2">
                        <List
                            rows={data.recent.activity}
                            empty="No activity yet"
                            render={(a) => (
                                <>
                                    <span className="truncate">{a.description}</span>
                                    <span className="text-xs text-gray-500 shrink-0">{dayjs(a.date).format('MMM D, HH:mm')}</span>
                                </>
                            )}
                        />
                    </ListCard>
                )}
            </div>

            {!data.sections.length && <Card><Empty>You do not have access to any dashboard metrics.</Empty></Card>}
        </div>
    )
}

export default Dashboard
