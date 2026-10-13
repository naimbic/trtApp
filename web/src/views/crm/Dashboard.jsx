import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import Card from '@/components/ui/Card'
import { useDashFilters, accentHex } from '@/store/dashFilterStore'
import Skeleton from '@/components/ui/Skeleton'
import Tag from '@/components/ui/Tag'
import Chart from '@/components/shared/Chart'
import {
    PiReceiptDuotone,
    PiHandCoinsDuotone,
    PiHourglassHighDuotone,
    PiWarningCircleDuotone,
    PiUsersThreeDuotone,
    PiFunnelDuotone,
    PiCheckSquareDuotone,
    PiLifebuoyDuotone,
    PiKanbanDuotone,
    PiFileTextDuotone,
} from 'react-icons/pi'

// ---------- formatting
const nf = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = (v) => Number(v || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 })
const nfi = (v) => Number(v || 0).toLocaleString('en-US')
const monthLabel = (m) => (m.length === 10 ? dayjs(m).format('D MMM') : dayjs(`${m}-01`).format('MMM YY'))

// ---------- chart styling shared by every chart
const PALETTE = { blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', red: '#ef4444', purple: '#8b5cf6', teal: '#14b8a6', pink: '#ec4899', slate: '#64748b' }
const SERIES = [PALETTE.blue, PALETTE.green, PALETTE.red, PALETTE.purple, PALETTE.amber, PALETTE.teal, PALETTE.pink, PALETTE.slate]
const grid = { borderColor: 'rgba(148,163,184,0.25)', strokeDashArray: 4, padding: { left: 8, right: 8 } }
const axisText = { style: { colors: '#94a3b8', fontSize: '12px' } }

// Status → colour so the same status looks the same on every chart.
const STATUS_COLOR = {
    Paid: PALETTE.green, Complete: PALETTE.green, Finished: PALETTE.green, Closed: PALETTE.green, Accepted: PALETTE.green, Qualified: PALETTE.green,
    'Partially paid': PALETTE.blue, 'In progress': PALETTE.blue, Answered: PALETTE.blue, Contacted: PALETTE.blue, Testing: PALETTE.purple,
    Unpaid: PALETTE.amber, Open: PALETTE.amber, 'Not started': PALETTE.slate, New: PALETTE.slate, Draft: PALETTE.slate, 'On hold': PALETTE.amber,
    'Awaiting feedback': PALETTE.amber, 'Proposal sent': PALETTE.purple, Negotiation: PALETTE.pink, Sent: PALETTE.blue,
    Overdue: PALETTE.red, Cancelled: PALETTE.red, Declined: PALETTE.red, Expired: PALETTE.red,
}
const statusColor = (name, i) => STATUS_COLOR[name] || SERIES[i % SERIES.length]

const TrendChart = ({ labels, series, colors = SERIES, height = 320, money, type = 'area' }) => (
    <Chart
        type={type}
        height={height}
        series={series}
        xAxis={labels}
        customOptions={{
            colors,
            chart: { toolbar: { show: false }, zoom: { enabled: false }, animations: { speed: 500 }, fontFamily: 'inherit' },
            stroke: { width: 3, curve: 'smooth' },
            fill: type === 'area' ? { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 95, 100] } } : { opacity: 1 },
            markers: { size: 0, hover: { size: 6 }, strokeWidth: 2, strokeColors: '#fff' },
            dataLabels: { enabled: false },
            grid,
            legend: { position: 'top', horizontalAlign: 'left', fontSize: '13px', markers: { radius: 12 }, itemMargin: { horizontal: 12 } },
            xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: axisText },
            yaxis: { min: 0, labels: { ...axisText, formatter: (v) => compact(v) } },
            tooltip: { shared: true, intersect: false, y: { formatter: (v) => (money ? money(v) : nfi(v)) } },
        }}
    />
)

const ColumnChart = ({ labels, series, colors, height = 260, money, negativeColor }) => (
    <Chart
        type="bar"
        height={height}
        series={series}
        xAxis={labels}
        customOptions={{
            colors,
            chart: { toolbar: { show: false }, fontFamily: 'inherit' },
            plotOptions: {
                bar: {
                    borderRadius: 6,
                    borderRadiusApplication: 'end',
                    columnWidth: '52%',
                    ...(negativeColor ? { colors: { ranges: [{ from: -1e12, to: -0.01, color: negativeColor }] } } : {}),
                },
            },
            dataLabels: { enabled: false },
            grid,
            legend: { show: false },
            xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { ...axisText, rotate: 0, hideOverlappingLabels: true, trim: false } },
            yaxis: { labels: { ...axisText, formatter: (v) => compact(v) } },
            tooltip: { y: { formatter: (v) => (money ? money(v) : nfi(v)) } },
        }}
    />
)

/** Status breakdown as a stacked summary line plus one progress line per status (Perfex / Ecme style). */
const StatusBars = ({ data, totalLabel = 'Total' }) => {
    const names = Object.keys(data || {}).sort((a, b) => data[b] - data[a])
    const total = names.reduce((sum, n) => sum + (data[n] || 0), 0)
    if (!names.length || !total) return <Empty />
    return (
        <div>
            <div className="flex items-end justify-between mb-3">
                <div>
                    <div className="text-3xl font-bold leading-none">{nfi(total)}</div>
                    <div className="text-xs text-gray-500 mt-1">{totalLabel}</div>
                </div>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 mb-5">
                {names.map((n, i) => (
                    <div key={n} title={`${n}: ${data[n]}`} style={{ width: `${(data[n] / total) * 100}%`, background: statusColor(n, i) }} />
                ))}
            </div>
            <ul className="flex flex-col gap-3.5">
                {names.map((n, i) => {
                    const pct = (data[n] / total) * 100
                    return (
                        <li key={n}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="flex items-center gap-2 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: statusColor(n, i) }} />
                                    <span className="truncate">{n}</span>
                                </span>
                                <span className="shrink-0 ml-3">
                                    <b>{nfi(data[n])}</b>
                                    <span className="text-gray-400"> / {nfi(total)} · {pct < 10 ? pct.toFixed(1) : Math.round(pct)}%</span>
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1.5)}%`, background: statusColor(n, i) }} />
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

const Sparkline = ({ data, color }) => (
    <Chart
        type="area"
        height={44}
        width="100%"
        series={[{ name: '', data }]}
        xAxis={data.map((_, i) => i)}
        customOptions={{
            colors: [color],
            chart: { sparkline: { enabled: true }, animations: { enabled: false } },
            stroke: { width: 2, curve: 'smooth' },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0 } },
            tooltip: { enabled: false },
        }}
    />
)

// ---------- small building blocks
const TONES = {
    blue: ['bg-blue-100 text-blue-600', PALETTE.blue],
    green: ['bg-emerald-100 text-emerald-600', PALETTE.green],
    amber: ['bg-amber-100 text-amber-600', PALETTE.amber],
    red: ['bg-red-100 text-red-600', PALETTE.red],
    purple: ['bg-purple-100 text-purple-600', PALETTE.purple],
    teal: ['bg-teal-100 text-teal-600', PALETTE.teal],
}

const StatCard = ({ icon, label, value, title, sub, tone = 'blue', to, spark, accent }) => {
    const useAccent = accent && tone !== 'red'
    const color = useAccent ? accent : TONES[tone][1]
    const body = (
        <Card className="h-full overflow-hidden" bodyClass="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm text-gray-500">{label}</div>
                    <h3 className="mt-1 truncate" title={title || undefined}>{value}</h3>
                    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
                </div>
                <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-2xl ${useAccent ? '' : TONES[tone][0]}`} style={useAccent ? { background: `${accent}1f`, color: accent } : undefined}>{icon}</div>
            </div>
            {spark && spark.length > 1 && <div className="-mx-4 -mb-4 mt-2"><Sparkline data={spark} color={color} /></div>}
        </Card>
    )
    return to ? <Link to={to}>{body}</Link> : body
}

const Empty = ({ children = 'No data yet' }) => <div className="text-sm text-gray-400 py-6 text-center">{children}</div>

const Panel = ({ title, subtitle, className = '', children }) => (
    <Card className={className}>
        <h4>{title}</h4>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        <div className="mt-4">{children}</div>
    </Card>
)

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

// ---------- page
const Dashboard = () => {
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const { range, from, to, currencyId: pickedCurrency, accent: accentKey, setCurrency, setCurrencies } = useDashFilters()
    const accent = accentHex(accentKey)
    // secondary series must never match the accent (e.g. green accent + green "collected")
    const second = [PALETTE.green, PALETTE.blue, PALETTE.amber, PALETTE.purple].find((c) => c.toLowerCase() !== accent.toLowerCase())
    const third = [PALETTE.red, PALETTE.slate, PALETTE.pink].find((c) => c.toLowerCase() !== accent.toLowerCase() && c !== second)

    // Custom range waits until both dates are set.
    const ready = range !== 'custom' || (from && to && from <= to)
    useEffect(() => {
        if (!ready) return undefined
        let alive = true
        setLoading(true)
        const qs = new URLSearchParams({ range, ...(range === 'custom' ? { from, to } : {}) })
        fetch(`/api/crm/dashboard?${qs}`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Dashboard failed (${r.status})`))))
            .then((d) => {
                if (!alive) return
                setData(d)
                setError(null)
                const used = Object.keys(d.invoices?.byCurrency || {})
                setCurrencies(d.currencies.filter((c) => used.includes(c.id)))
                if (!used.includes(useDashFilters.getState().currencyId)) {
                    const def = d.currencies.find((c) => c.isDefault && used.includes(c.id)) || d.currencies.find((c) => used.includes(c.id))
                    setCurrency(def?.id || used[0] || null)
                }
            })
            .catch((e) => alive && setError(e.message))
            .finally(() => alive && setLoading(false))
        return () => {
            alive = false
        }
    }, [range, from, to, ready, setCurrency, setCurrencies])

    const currencyId = pickedCurrency

    const cur = useMemo(() => data?.currencies.find((c) => c.id === currencyId), [data, currencyId])
    const fmt = (v, id, short) => {
        const c = data?.currencies.find((x) => x.id === id) || cur
        const s = c?.symbol || c?.name || ''
        const n = short ? compact(v) : nf(v)
        return c?.placement === 'after' ? `${n} ${s}` : `${s ? s + ' ' : ''}${n}`
    }
    const money = (v, id = currencyId) => fmt(v, id, false)
    const moneyShort = (v, id = currencyId) => fmt(v, id, true)

    if (error) return <Card>Could not load the dashboard: {error}</Card>
    if (!data) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton height={28} width={220} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={120} />)}
                </div>
                <Skeleton height={340} />
            </div>
        )
    }

    const inv = data.invoices?.byCurrency?.[currencyId]
    const exp = data.expenses?.byCurrency?.[currencyId]
    const usedCurrencies = data.currencies.filter((c) => data.invoices?.byCurrency?.[c.id])
    const months = data.months
    const labels = months.map(monthLabel)
    const invoicedSeries = inv ? months.map((m) => inv.invoicedByMonth[m] || 0) : []
    const collectedSeries = inv ? months.map((m) => inv.collectedByMonth[m] || 0) : []
    const expenseSeries = exp ? months.map((m) => exp[m] || 0) : months.map(() => 0)
    const net = collectedSeries.map((v, i) => Math.round((v - expenseSeries[i]) * 100) / 100)
    let run = 0
    const cumCollected = collectedSeries.map((v) => (run += v))
    run = 0
    const cumInvoiced = invoicedSeries.map((v) => (run += v))
    const newClients = months.map((m) => data.clients?.byMonth?.[m] || 0)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3>Dashboard</h3>
                    <p className="text-sm text-gray-500">{data.range?.key === 'custom' ? '' : `${data.range?.label} · `}{data.range?.from} → {data.range?.to}{loading ? ' · updating…' : ''}</p>
                </div>
            </div>

            {data.invoices && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard accent={accent} icon={<PiReceiptDuotone />} label="Total invoiced" value={moneyShort(inv?.invoiced)} title={money(inv?.invoiced)} sub="Excl. drafts & cancelled" tone="blue" to="/crm/invoices" spark={invoicedSeries} />
                    <StatCard accent={accent} icon={<PiHandCoinsDuotone />} label="Collected" value={moneyShort(inv?.paid)} title={money(inv?.paid)} sub={inv?.invoiced ? `${Math.round((inv.paid / inv.invoiced) * 100)}% of invoiced` : ''} tone="green" to="/crm/payments" spark={collectedSeries} />
                    <StatCard accent={accent} icon={<PiHourglassHighDuotone />} label="Outstanding" value={moneyShort(inv?.outstanding)} title={money(inv?.outstanding)} sub="Still to collect" tone="amber" spark={cumInvoiced.map((v, i) => Math.max(v - cumCollected[i], 0))} />
                    <StatCard accent={accent} icon={<PiWarningCircleDuotone />} label="Overdue" value={moneyShort(inv?.overdue)} title={money(inv?.overdue)} sub={`${nfi(inv?.overdueCount)} invoice(s)`} tone="red" />
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {data.clients && <StatCard accent={accent} icon={<PiUsersThreeDuotone />} label="Clients" value={nfi(data.clients.total)} sub={`${nfi(data.clients.active)} active`} tone="blue" to="/crm/clients" spark={newClients} />}
                {data.leads && <StatCard accent={accent} icon={<PiFunnelDuotone />} label="Open leads" value={nfi(data.leads.open)} sub={`${nfi(data.leads.converted)} converted`} tone="purple" to="/crm/leads" />}
                {data.projects && <StatCard accent={accent} icon={<PiKanbanDuotone />} label="Projects" value={nfi(data.projects.total)} sub={`${nfi(data.projects.byStatus?.['In progress'])} in progress`} tone="teal" to="/crm/projects" />}
                {data.tasks && <StatCard accent={accent} icon={<PiCheckSquareDuotone />} label="Open tasks" value={nfi(data.tasks.open)} sub={`${nfi(data.tasks.overdue)} overdue`} tone={data.tasks.overdue ? 'red' : 'green'} to="/crm/tasks" />}
                {data.tickets && <StatCard accent={accent} icon={<PiLifebuoyDuotone />} label="Open tickets" value={nfi(data.tickets.open)} sub={`${nfi(data.tickets.total)} total`} tone="amber" to="/crm/tickets" />}
                {data.estimates && <StatCard accent={accent} icon={<PiFileTextDuotone />} label="Estimates" value={nfi(data.estimates.total)} sub={`${nfi(data.estimates.byStatus?.Sent)} sent`} tone="blue" to="/crm/estimates" />}
            </div>

            {inv && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <Panel className="xl:col-span-2" title={`Revenue · ${data.range?.label?.toLowerCase()}`} subtitle={`Invoiced vs collected vs expenses (${cur?.name})`}>
                        <TrendChart
                            labels={labels}
                            money={money}
                            colors={[accent, second, third]}
                            series={[
                                { name: 'Invoiced', data: invoicedSeries },
                                { name: 'Collected', data: collectedSeries },
                                { name: 'Expenses', data: expenseSeries },
                            ]}
                        />
                    </Panel>
                    <Panel title="Invoices by status" subtitle="Excl. drafts & cancelled">
                        <StatusBars data={inv.byStatus} totalLabel="Invoices" />
                    </Panel>
                </div>
            )}

            {inv && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <Panel className="xl:col-span-2" title="Cumulative cash position" subtitle={`Running total invoiced vs collected (${cur?.name}) — the gap is what is still owed`}>
                        <TrendChart
                            labels={labels}
                            money={money}
                            colors={[accent, second]}
                            height={280}
                            series={[
                                { name: 'Invoiced (cumulative)', data: cumInvoiced },
                                { name: 'Collected (cumulative)', data: cumCollected },
                            ]}
                        />
                    </Panel>
                    <Panel title="Net cash flow" subtitle="Collected minus expenses">
                        <ColumnChart labels={labels} money={money} colors={[PALETTE.teal]} negativeColor={PALETTE.red} height={280} series={[{ name: 'Net', data: net }]} />
                    </Panel>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.leads && <Panel title="Open leads by status"><StatusBars data={data.leads.byStatus} totalLabel="Open leads" /></Panel>}
                {data.tasks && <Panel title="Tasks by status"><StatusBars data={data.tasks.byStatus} totalLabel="Tasks" /></Panel>}
                {data.projects && <Panel title="Projects by status"><StatusBars data={data.projects.byStatus} totalLabel="Projects" /></Panel>}
                {data.tickets && <Panel title="Tickets by status"><StatusBars data={data.tickets.byStatus} totalLabel="Tickets" /></Panel>}
            </div>

            {data.clients && (
                <Panel title="New clients per month" subtitle="Client acquisition trend">
                    <TrendChart labels={labels} colors={[accent]} height={220} series={[{ name: 'New clients', data: newClients }]} />
                </Panel>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.invoices && (
                    <Card>
                        <h4 className="mb-2">Top clients by invoiced</h4>
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
                    </Card>
                )}
                {data.invoices && (
                    <Card>
                        <h4 className="mb-2">Overdue invoices</h4>
                        <List
                            rows={data.invoices.overdueList}
                            empty="Nothing overdue"
                            render={(i) => (
                                <>
                                    <div className="min-w-0">
                                        <Link className="font-medium hover:underline" to={`/crm/invoices/${i.id}`}>{i.number}</Link>
                                        <div className="text-xs text-gray-500 truncate">{i.company} · due {dayjs(i.dueDate).format('YYYY-MM-DD')}</div>
                                    </div>
                                    <Tag className="bg-red-200 text-gray-900 shrink-0">{money(i.due, i.currencyId)}</Tag>
                                </>
                            )}
                        />
                    </Card>
                )}
                {data.recent && (
                    <Card>
                        <h4 className="mb-2">Recent payments</h4>
                        <List
                            rows={data.recent.payments}
                            empty="No payments yet"
                            render={(p) => (
                                <>
                                    <div className="min-w-0">
                                        <Link className="font-medium hover:underline" to={`/crm/invoices/${p.invoiceId}`}>{p.invoiceNumber || 'Payment'}</Link>
                                        <div className="text-xs text-gray-500">{p.date ? dayjs(p.date).format('YYYY-MM-DD') : ''}</div>
                                    </div>
                                    <span className="font-semibold text-emerald-600 shrink-0">+{money(p.amount, p.currencyId)}</span>
                                </>
                            )}
                        />
                    </Card>
                )}
                {data.tasks && (
                    <Card>
                        <h4 className="mb-2">Tasks due this week</h4>
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
                    </Card>
                )}
                {data.recent && (
                    <Card className="xl:col-span-2">
                        <h4 className="mb-2">Recent sales activity</h4>
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
                    </Card>
                )}
            </div>

            {!data.sections.length && <Card><Empty>You do not have access to any dashboard metrics.</Empty></Card>}
        </div>
    )
}

export default Dashboard
