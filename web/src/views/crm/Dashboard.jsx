import { moneyHidden, MASK } from '@/utils/money'
import { useTaskStatuses, taskColorByName } from './tasks/shared'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router'
import dayjs from 'dayjs'
import Card from '@/components/ui/Card'
import { KpiCard } from './kit/KpiCard'
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
import { tr } from '@/utils/t'
import { useSessionUser } from '@/store/authStore'
import RiseTitle from './kit/RiseTitle'
import RapportOverview from './dashboard/RapportOverview'
import { pctChange } from './kit/KpiCard'

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

const TrendChart = ({ labels, series, colors = SERIES, height = 320, money, type: wanted = 'area', compare }) => {
    const type = compare ? 'line' : wanted // with a comparison, plain lines read better than stacked fills
    const all = compare ? [...series, ...compare] : series
    const cols = compare ? [...colors.slice(0, series.length), ...colors.slice(0, series.length).map((c) => `${c}8c`)] : colors
    return (
    <Chart
        type={type}
        height={height}
        series={all}
        xAxis={labels}
        customOptions={{
            colors: cols,
            chart: { toolbar: { show: false }, zoom: { enabled: false }, animations: { speed: 500 }, fontFamily: 'inherit' },
            stroke: compare ? { width: [...series.map(() => 3), ...compare.map(() => 2)], curve: 'smooth', dashArray: [...series.map(() => 0), ...compare.map(() => 6)] } : { width: 3, curve: 'smooth' },
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
}

const ColumnChart = ({ labels, series, colors, height = 260, money, negativeColor, compare }) => (
    <Chart
        type="bar"
        height={height}
        series={compare ? [...series, ...compare] : series}
        xAxis={labels}
        customOptions={{
            colors: compare ? [...colors, '#cbd5e1'] : colors,
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
const StatusBars = ({ data, totalLabel = 'Total', colorOf }) => {
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
                    <div key={n} title={`${tr(n)}: ${data[n]}`} style={{ width: `${(data[n] / total) * 100}%`, background: (colorOf && colorOf(n)) || statusColor(n, i) }} />
                ))}
            </div>
            <ul className="flex flex-col gap-3.5">
                {names.map((n, i) => {
                    const pct = (data[n] / total) * 100
                    return (
                        <li key={n}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="flex items-center gap-2 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: (colorOf && colorOf(n)) || statusColor(n, i) }} />
                                    <span className="truncate">{tr(n)}</span>
                                </span>
                                <span className="shrink-0 ml-3">
                                    <b>{nfi(data[n])}</b>
                                    <span className="text-gray-400"> / {nfi(total)} · {pct < 10 ? pct.toFixed(1) : Math.round(pct)}%</span>
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1.5)}%`, background: (colorOf && colorOf(n)) || statusColor(n, i) }} />
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

const StatCard = (props) => <KpiCard {...props} />

const Empty = ({ children = tr("No data yet") }) => <div className="text-sm text-gray-400 py-6 text-center">{children}</div>

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
const BusinessDashboard = () => {
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
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(tr("Dashboard failed ({status})", { status: r.status })))))
            .then((d) => {
                if (!alive) return
                setData(d)
                setError(null)
                const used = Object.keys(d.invoices?.byCurrency || {})
                const realCur = d.currencies.filter((c) => used.includes(c.id))
                setCurrencies(realCur.length > 1 ? [...realCur, { id: 'all', name: 'ALL' }] : realCur)
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

    const cur = useMemo(() => data?.currencies.find((c) => c.id === currencyId) || (currencyId === 'all' ? data?.currencies.find((c) => c.isDefault) || data?.currencies[0] : undefined), [data, currencyId])
    const fmt = (v, id, short) => {
        if (moneyHidden()) return MASK
        const c = data?.currencies.find((x) => x.id === id) || cur || data?.currencies.find((x) => x.isDefault)
        const s = c?.symbol || c?.name || ''
        const n = short ? compact(v) : nf(v)
        return c?.placement === 'after' ? `${n} ${s}` : `${s ? s + ' ' : ''}${n}`
    }
    const money = (v, id = currencyId) => fmt(v, id, false)
    const moneyShort = (v, id = currencyId) => fmt(v, id, true)

    if (error) return <Card>{tr("Could not load the dashboard:")} {error}</Card>
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
    // previous period, lined up bucket by bucket with the current one
    const padTo = (arr) => Array.from({ length: months.length }, (_, i) => arr[i] ?? 0)
    const pm = data.prev?.months || []
    const pinv = data.prev?.invoices?.byCurrency?.[currencyId]
    const pexp = data.prev?.expenses?.byCurrency?.[currencyId]
    const prevInvoiced = pinv ? padTo(pm.map((m) => pinv.invoicedByMonth[m] || 0)) : null
    const prevCollected = pinv ? padTo(pm.map((m) => pinv.collectedByMonth[m] || 0)) : null
    const prevExpense = padTo(pm.map((m) => (pexp ? pexp[m] || 0 : 0)))
    const prevNet = prevCollected ? prevCollected.map((v, i) => Math.round((v - prevExpense[i]) * 100) / 100) : null
    const cum = (a) => { let r = 0; return a.map((v) => (r += v)) }
    const prevNewClients = data.prev?.clients ? padTo(pm.map((m) => data.prev.clients.byMonth?.[m] || 0)) : null
    const PREV = tr("Previous period")
    const vsPrev = tr("vs previous period")
    const vsStart = tr("since the period began")
    const ch = (cur, prev, goodUp = true, label = vsPrev) => (prev === undefined || prev === null || cur === undefined || cur === null ? undefined : { cur, prev, goodUp, label })
    const pd = data.prev

    // the Overview of the Rapport template leads the page whenever the money figures are shown
    const overview = !!(data.invoices && inv && !data.moneyHidden)
    const sameCur = (c) => (c.currencyId || 'none') === (currencyId || 'none')

    return (
        <div className={`${overview ? '' : 'rp-land '}flex flex-col gap-4`}>
            {overview && (
                <RapportOverview
                    data={data} inv={inv} labels={labels} currencyId={currencyId} money={money} moneyShort={moneyShort}
                    series={{ invoiced: invoicedSeries, collected: collectedSeries, prevInvoiced, prevCollected }}
                    paidDelta={pinv ? pctChange(inv.paid, pinv.paid) : null}
                    topClients={data.invoices.topClients.filter(sameCur)} upcoming={data.tasks?.upcoming || []} activity={data.recent?.activity || []}
                />
            )}
            {!overview && <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <RiseTitle text={tr("Dashboard")} />
                    <p className="rp-sub">{data.range?.key === 'custom' ? '' : `${tr(data.range?.label)} · `}{data.range?.from} → {data.range?.to}{loading ? tr(" · updating…") : ''}</p>
                </div>
            </div>}

            {data.moneyHidden && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard accent={accent} icon={<PiReceiptDuotone />} label={tr("Total invoiced")} value={MASK} sub={tr("Hidden for your account")} tone="blue" />
                    <StatCard accent={accent} icon={<PiHandCoinsDuotone />} label={tr("Collected")} value={MASK} sub={tr("Hidden for your account")} tone="green" />
                    <StatCard accent={accent} icon={<PiHourglassHighDuotone />} label={tr("Outstanding")} value={MASK} sub={tr("Hidden for your account")} tone="amber" />
                    <StatCard accent={accent} icon={<PiWarningCircleDuotone />} label={tr("Overdue")} value={MASK} sub={tr("Hidden for your account")} tone="red" />
                </div>
            )}

            {data.invoices && !overview && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard accent={accent} icon={<PiReceiptDuotone />} label={tr("Total invoiced")} value={moneyShort(inv?.invoiced)} title={money(inv?.invoiced)} sub={tr("Excl. drafts & cancelled")} change={ch(inv?.invoiced, pinv?.invoiced)} tone="blue" to="/crm/invoices" spark={invoicedSeries} />
                    <StatCard accent={accent} icon={<PiHandCoinsDuotone />} label={tr("Collected")} value={moneyShort(inv?.paid)} title={money(inv?.paid)} sub={inv?.invoiced ? tr("{v1}% of invoiced", { v1: Math.round((inv.paid / inv.invoiced) * 100) }) : ''} change={ch(inv?.paid, pinv?.paid)} tone="green" to="/crm/payments" spark={collectedSeries} />
                    <StatCard accent={accent} icon={<PiHourglassHighDuotone />} label={tr("Outstanding")} value={moneyShort(inv?.outstanding)} title={money(inv?.outstanding)} sub={tr("Still to collect")} change={ch(inv?.outstanding, inv?.outstandingAtStart, false, vsStart)} tone="amber" spark={cumInvoiced.map((v, i) => Math.max(v - cumCollected[i], 0))} />
                    <StatCard accent={accent} icon={<PiWarningCircleDuotone />} label={tr("Overdue")} value={moneyShort(inv?.overdue)} title={money(inv?.overdue)} sub={`${nfi(inv?.overdueCount)} invoice(s)`} change={ch(inv?.overdue, inv?.overdueAtStart, false, vsStart)} tone="red" />
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {data.clients && <StatCard accent={accent} icon={<PiUsersThreeDuotone />} label={tr("Clients")} value={nfi(data.clients.total)} sub={tr("{v1} active", { v1: nfi(data.clients.active) })} change={ch(data.clients.total, data.clients.totalAtStart, true, vsStart)} tone="blue" to="/crm/clients" spark={newClients} />}
                {data.leads && <StatCard accent={accent} icon={<PiFunnelDuotone />} label={tr("Open leads")} value={nfi(data.leads.open)} sub={tr("{v1} converted", { v1: nfi(data.leads.converted) })} change={ch(data.leads.open, pd?.leads?.open)} tone="purple" to="/crm/leads" />}
                {data.projects && <StatCard accent={accent} icon={<PiKanbanDuotone />} label={tr("Projects")} value={nfi(data.projects.total)} sub={tr("{v1} in progress", { v1: nfi(data.projects.byStatus?.["In progress"]) })} change={ch(data.projects.total, pd?.projects?.total)} tone="teal" to="/crm/projects" />}
                {data.tasks && <StatCard accent={accent} icon={<PiCheckSquareDuotone />} label={tr("Open tasks")} value={nfi(data.tasks.open)} sub={tr("{v1} overdue", { v1: nfi(data.tasks.overdue) })} change={ch(data.tasks.open, pd?.tasks?.open, false)} tone={data.tasks.overdue ? 'red' : 'green'} to="/crm/tasks" />}
                {data.tickets && <StatCard accent={accent} icon={<PiLifebuoyDuotone />} label={tr("Open tickets")} value={nfi(data.tickets.open)} sub={tr("{v1} total", { v1: nfi(data.tickets.total) })} change={ch(data.tickets.open, pd?.tickets?.open, false)} tone="amber" to="/crm/tickets" />}
                {data.estimates && <StatCard accent={accent} icon={<PiFileTextDuotone />} label={tr("Estimates")} value={nfi(data.estimates.total)} sub={tr("{v1} sent", { v1: nfi(data.estimates.byStatus?.Sent) })} change={ch(data.estimates.total, pd?.estimates?.total)} tone="blue" to="/crm/estimates" />}
            </div>

            {data.moneyHidden && (
                <Panel title={tr("Revenue and cash flow")} subtitle={tr("Invoiced, collected and expenses")}><div className="flex h-40 items-center justify-center text-center text-gray-400"><div><div className="text-3xl font-bold">{MASK}</div><div className="mt-1 text-sm">{tr("Financial figures are hidden for your account.")}</div></div></div></Panel>
            )}

            {inv && !overview && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <Panel className="xl:col-span-2" title={tr("Revenue · {v1}", { v1: tr(data.range?.label)?.toLowerCase() })} subtitle={tr("Invoiced vs collected vs expenses ({name})", { name: cur?.name })}>
                        <TrendChart
                            labels={labels}
                            money={money}
                            colors={[accent, second, third]}
                            series={[
                                { name: tr("Invoiced"), data: invoicedSeries },
                                { name: tr("Collected"), data: collectedSeries },
                                { name: tr("Expenses"), data: expenseSeries },
                            ]}
                            compare={prevInvoiced ? [{ name: `Invoiced · ${PREV.toLowerCase()}`, data: prevInvoiced }, { name: `Collected · ${PREV.toLowerCase()}`, data: prevCollected }, { name: `Expenses · ${PREV.toLowerCase()}`, data: prevExpense }] : null}
                        />
                    </Panel>
                    <Panel title={tr("Invoices by status")} subtitle={tr("Excl. drafts & cancelled")}>
                        <StatusBars data={inv.byStatus} totalLabel={tr("Invoices")} />
                    </Panel>
                </div>
            )}

            {inv && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <Panel className="xl:col-span-2" title={tr("Cumulative cash position")} subtitle={tr("Running total invoiced vs collected ({name}) — the gap is what is still owed", { name: cur?.name })}>
                        <TrendChart
                            labels={labels}
                            money={money}
                            colors={[accent, second]}
                            height={280}
                            series={[
                                { name: tr("Invoiced (cumulative)"), data: cumInvoiced },
                                { name: tr("Collected (cumulative)"), data: cumCollected },
                            ]}
                            compare={prevInvoiced ? [{ name: `Invoiced · ${PREV.toLowerCase()}`, data: cum(prevInvoiced) }, { name: `Collected · ${PREV.toLowerCase()}`, data: cum(prevCollected) }] : null}
                        />
                    </Panel>
                    <Panel title={tr("Net cash flow")} subtitle={tr("Collected minus expenses")}>
                        <ColumnChart labels={labels} money={money} colors={[PALETTE.teal]} negativeColor={PALETTE.red} height={280} series={[{ name: tr("Net"), data: net }]} compare={prevNet ? [{ name: PREV, data: prevNet }] : null} />
                    </Panel>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.leads && <Panel title={tr("Open leads by status")}><StatusBars data={data.leads.byStatus} totalLabel={tr("Open leads")} /></Panel>}
                {data.tasks && <Panel title={tr("Tasks by status")}><StatusBars data={data.tasks.byStatus} totalLabel={tr("Tasks")} colorOf={taskColorByName} /></Panel>}
                {data.projects && <Panel title={tr("Projects by status")}><StatusBars data={data.projects.byStatus} totalLabel={tr("Projects")} /></Panel>}
                {data.tickets && <Panel title={tr("Tickets by status")}><StatusBars data={data.tickets.byStatus} totalLabel={tr("Tickets")} /></Panel>}
            </div>

            {data.clients && (
                <Panel title={tr("New clients per month")} subtitle={tr("Client acquisition trend")}>
                    <TrendChart labels={labels} colors={[accent]} height={220} series={[{ name: tr("New clients"), data: newClients }]} compare={prevNewClients ? [{ name: PREV, data: prevNewClients }] : null} />
                </Panel>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.invoices && (
                    <Card>
                        <h4 className="mb-2">{tr("Top clients by invoiced")}</h4>
                        <List
                            rows={data.invoices.topClients.filter((c) => (c.currencyId || 'none') === (currencyId || 'none'))}
                            empty={tr("No invoices yet")}
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
                        <h4 className="mb-2">{tr("Overdue invoices")}</h4>
                        <List
                            rows={data.invoices.overdueList}
                            empty={tr("Nothing overdue")}
                            render={(i) => (
                                <>
                                    <div className="min-w-0">
                                        <Link className="font-medium hover:underline" to={`/crm/invoices/${i.id}`}>{i.number}</Link>
                                        <div className="text-xs text-gray-500 truncate">{i.company} {tr("· due")} {dayjs(i.dueDate).format('YYYY-MM-DD')}</div>
                                    </div>
                                    <Tag className="bg-red-200 text-gray-900 shrink-0">{money(i.due, i.currencyId)}</Tag>
                                </>
                            )}
                        />
                    </Card>
                )}
                {data.recent && (
                    <Card>
                        <h4 className="mb-2">{tr("Recent payments")}</h4>
                        <List
                            rows={data.recent.payments}
                            empty={tr("No payments yet")}
                            render={(p) => (
                                <>
                                    <div className="min-w-0">
                                        <Link className="font-medium hover:underline" to={`/crm/invoices/${p.invoiceId}`}>{p.invoiceNumber || tr("Payment")}</Link>
                                        <div className="text-xs text-gray-500">{p.date ? dayjs(p.date).format('YYYY-MM-DD') : ''}</div>
                                    </div>
                                    <span className="font-semibold text-emerald-600 shrink-0">+{money(p.amount, p.currencyId)}</span>
                                </>
                            )}
                        />
                    </Card>
                )}
            </div>

            {!data.sections.length && <Card><Empty>{tr("You do not have access to any dashboard metrics.")}</Empty></Card>}
        </div>
    )
}

/** The business dashboard is for administrators; everyone else lands on the Team dashboard. */
const Dashboard = () => {
    useTaskStatuses()
    const authority = useSessionUser((s) => s.user.authority) || []
    const allowed = authority.includes('admin') || authority.includes('crm.admin') || authority.includes('crm.dashboard.view') || authority.includes('crm.roles.view')
    return allowed ? <BusinessDashboard /> : <Navigate to="/team-dashboard" replace />
}

export default Dashboard
