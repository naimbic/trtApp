import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import Card from '@/components/ui/Card'
import Segment from '@/components/ui/Segment'
import Skeleton from '@/components/ui/Skeleton'
import Tag from '@/components/ui/Tag'
import Chart from '@/components/shared/Chart'
import { COLORS } from '@/constants/chart.constant'
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

const nf = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = (v) => Number(v || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 })
const nfi = (v) => Number(v || 0).toLocaleString('en-US')
const monthLabel = (m) => dayjs(`${m}-01`).format('MMM YY')

const StatCard = ({ icon, label, value, title, sub, tone = 'blue', to }) => {
    const tones = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-emerald-100 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-600',
        teal: 'bg-teal-100 text-teal-600',
    }
    const body = (
        <Card className="h-full">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm text-gray-500">{label}</div>
                    <h3 className="mt-1 truncate" title={title || undefined}>{value}</h3>
                    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
                </div>
                <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${tones[tone]}`}>{icon}</div>
            </div>
        </Card>
    )
    return to ? <Link to={to}>{body}</Link> : body
}

const Empty = ({ children = 'No data yet' }) => <div className="text-sm text-gray-400 py-6 text-center">{children}</div>

const Donut = ({ data, title }) => {
    const labels = Object.keys(data || {})
    const series = labels.map((l) => data[l])
    if (!series.length || series.every((v) => !v)) return <Empty />
    return <Chart type="donut" series={series} height={260} donutTitle={title} customOptions={{ labels, legend: { position: 'bottom' } }} />
}

const Bars = ({ data, color = COLORS[0] }) => {
    const labels = Object.keys(data || {})
    if (!labels.length) return <Empty />
    return (
        <Chart
            type="bar"
            height={260}
            series={[{ name: 'Count', data: labels.map((l) => data[l]) }]}
            xAxis={labels}
            customOptions={{ colors: [color], plotOptions: { bar: { borderRadius: 4, columnWidth: '45%', distributed: false } } }}
        />
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

    const moneyShort = (v, id = currencyId) => {
        const c = data?.currencies.find((x) => x.id === id) || cur
        const s = c?.symbol || c?.name || ''
        return c?.placement === 'after' ? `${compact(v)} ${s}` : `${s ? s + ' ' : ''}${compact(v)}`
    }

    if (error) return <Card>Could not load the dashboard: {error}</Card>
    if (!data) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton height={28} width={220} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={96} />)}
                </div>
                <Skeleton height={320} />
            </div>
        )
    }

    const inv = data.invoices?.byCurrency?.[currencyId]
    const exp = data.expenses?.byCurrency?.[currencyId]
    const usedCurrencies = data.currencies.filter((c) => data.invoices?.byCurrency?.[c.id])
    const months = data.months
    const labels = months.map(monthLabel)
    const profit = inv ? months.map((m) => (inv.collectedByMonth[m] || 0) - (exp?.[m] || 0)) : []

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3>Dashboard</h3>
                    <p className="text-sm text-gray-500">Business overview · updated {dayjs(data.generatedAt).format('HH:mm')}</p>
                </div>
                {usedCurrencies.length > 1 && (
                    <Segment value={currencyId} size="sm" onChange={(v) => setCurrencyId(v)}>
                        {usedCurrencies.map((c) => (
                            <Segment.Item key={c.id} value={c.id}>{c.name}</Segment.Item>
                        ))}
                    </Segment>
                )}
            </div>

            {data.invoices && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard icon={<PiReceiptDuotone />} label="Total invoiced" value={moneyShort(inv?.invoiced)} title={money(inv?.invoiced)} sub="Excl. drafts & cancelled" tone="blue" to="/crm/invoices" />
                    <StatCard icon={<PiHandCoinsDuotone />} label="Collected" value={moneyShort(inv?.paid)} title={money(inv?.paid)} sub={inv?.invoiced ? `${Math.round((inv.paid / inv.invoiced) * 100)}% of invoiced` : ''} tone="green" to="/crm/payments" />
                    <StatCard icon={<PiHourglassHighDuotone />} label="Outstanding" value={moneyShort(inv?.outstanding)} title={money(inv?.outstanding)} sub="Still to collect" tone="amber" />
                    <StatCard icon={<PiWarningCircleDuotone />} label="Overdue" value={moneyShort(inv?.overdue)} title={money(inv?.overdue)} sub={`${nfi(inv?.overdueCount)} invoice(s)`} tone="red" />
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {data.clients && <StatCard icon={<PiUsersThreeDuotone />} label="Clients" value={nfi(data.clients.total)} sub={`${nfi(data.clients.active)} active`} tone="blue" to="/crm/clients" />}
                {data.leads && <StatCard icon={<PiFunnelDuotone />} label="Open leads" value={nfi(data.leads.open)} sub={`${nfi(data.leads.converted)} converted`} tone="purple" to="/crm/leads" />}
                {data.projects && <StatCard icon={<PiKanbanDuotone />} label="Projects" value={nfi(data.projects.total)} sub={`${nfi(data.projects.byStatus?.['In progress'])} in progress`} tone="teal" to="/crm/projects" />}
                {data.tasks && <StatCard icon={<PiCheckSquareDuotone />} label="Open tasks" value={nfi(data.tasks.open)} sub={`${nfi(data.tasks.overdue)} overdue`} tone={data.tasks.overdue ? 'red' : 'green'} to="/crm/tasks" />}
                {data.tickets && <StatCard icon={<PiLifebuoyDuotone />} label="Open tickets" value={nfi(data.tickets.open)} sub={`${nfi(data.tickets.total)} total`} tone="amber" to="/crm/tickets" />}
                {data.estimates && <StatCard icon={<PiFileTextDuotone />} label="Estimates" value={nfi(data.estimates.total)} sub={`${nfi(data.estimates.byStatus?.Sent)} sent`} tone="blue" to="/crm/estimates" />}
            </div>

            {inv && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <Card className="xl:col-span-2">
                        <h4 className="mb-1">Revenue · last 12 months</h4>
                        <p className="text-sm text-gray-500 mb-4">Invoiced vs collected vs expenses ({cur?.name})</p>
                        <Chart
                            type="area"
                            height={320}
                            series={[
                                { name: 'Invoiced', data: months.map((m) => inv.invoicedByMonth[m] || 0) },
                                { name: 'Collected', data: months.map((m) => inv.collectedByMonth[m] || 0) },
                                ...(exp ? [{ name: 'Expenses', data: months.map((m) => exp[m] || 0) }] : []),
                            ]}
                            xAxis={labels}
                            customOptions={{ legend: { position: 'top' }, yaxis: { min: 0, labels: { formatter: (v) => compact(v) } } }}
                        />
                    </Card>
                    <Card>
                        <h4 className="mb-4">Invoices by status</h4>
                        <Donut data={inv.byStatus} title="Invoices" />
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.leads && (
                    <Card>
                        <h4 className="mb-4">Open leads by status</h4>
                        <Donut data={data.leads.byStatus} title="Leads" />
                    </Card>
                )}
                {data.tasks && (
                    <Card>
                        <h4 className="mb-4">Tasks by status</h4>
                        <Bars data={data.tasks.byStatus} color={COLORS[1]} />
                    </Card>
                )}
                {data.projects && (
                    <Card>
                        <h4 className="mb-4">Projects by status</h4>
                        <Donut data={data.projects.byStatus} title="Projects" />
                    </Card>
                )}
                {data.tickets && (
                    <Card>
                        <h4 className="mb-4">Tickets by status</h4>
                        <Bars data={data.tickets.byStatus} color={COLORS[4]} />
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {data.clients && (
                    <Card>
                        <h4 className="mb-4">New clients per month</h4>
                        <Chart type="bar" height={240} series={[{ name: 'Clients', data: months.map((m) => data.clients.byMonth[m] || 0) }]} xAxis={labels} customOptions={{ colors: [COLORS[3]], plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } } }} />
                    </Card>
                )}
                {inv && profit.length > 0 && (
                    <Card className="xl:col-span-2">
                        <h4 className="mb-1">Net cash flow</h4>
                        <p className="text-sm text-gray-500 mb-4">Collected minus expenses per month ({cur?.name})</p>
                        <Chart type="bar" height={240} series={[{ name: 'Net', data: profit.map((v) => Math.round(v * 100) / 100) }]} xAxis={labels} customOptions={{ colors: [COLORS[5]], plotOptions: { bar: { borderRadius: 4, columnWidth: '45%', colors: { ranges: [{ from: -1e12, to: -0.01, color: COLORS[2] }] } } } }} />
                    </Card>
                )}
            </div>

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
                            empty="Nothing overdue 🎉"
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
