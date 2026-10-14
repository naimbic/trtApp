import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbDownload, TbCash, TbReceipt2, TbTrendingUp, TbAlertTriangle, TbUsersGroup, TbTargetArrow, TbClock, TbLifebuoy, TbChecklist, TbHourglass, TbScale, TbPercentage } from 'react-icons/tb'
import dayjs from 'dayjs'
import Chart from '@/components/shared/Chart'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'
import classNames from '@/utils/classNames'
import { api, qs } from '../kit/api'

const { Tr, Th, Td, THead, TBody } = Table
const TABS = { sales: 'Sales', profit: 'Profit & expenses', leads: 'Leads', support: 'Support', work: 'Work & time' }
const RANGES = [['month', 'This month'], ['lastmonth', 'Last month'], ['30d', 'Last 30 days'], ['year', 'This year'], ['12m', 'Last 12 months'], ['custom', 'Custom dates']]
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#64748b']

const Stat = ({ title, value, sub, className, icon }) => (
    <div className={classNames('flex items-center justify-between rounded-2xl p-4', className)}>
        <div className="min-w-0"><div className="mb-3 font-bold text-gray-900">{title}</div><h3 className="truncate text-gray-900">{value}</h3>{sub && <div className="mt-1 text-xs text-gray-700">{sub}</div>}</div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-2xl text-white">{icon}</div>
    </div>
)

const csv = (name, head, rows) => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const blob = new Blob([`﻿${[head, ...rows].map((r) => r.map(esc).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${name}-${dayjs().format('YYYY-MM-DD')}.csv`; a.click(); URL.revokeObjectURL(a.href)
}

const Block = ({ title, children, export: ex, className }) => (
    <Card className={className}>
        <div className="mb-3 flex items-center justify-between gap-2"><h5>{title}</h5>{ex && <Button size="xs" icon={<TbDownload />} onClick={() => csv(ex.name, ex.head, ex.rows)}>CSV</Button>}</div>
        {children}
    </Card>
)
const Empty = () => <p className="py-8 text-center text-gray-500">No data for this period.</p>

const useFmt = (cur) => useMemo(() => {
    const m = (n, d = 2) => { const v = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); const s = cur?.symbol || cur?.name || ''; return cur?.placement === 'after' ? `${v} ${s}` : `${s ? `${s} ` : ''}${v}` }
    return { m, n: (v) => Number(v || 0).toLocaleString('en-US') }
}, [cur])

const labelsOf = (d) => d.labels.map((l) => (l.length === 7 ? dayjs(`${l}-01`).format('MMM YY') : dayjs(l).format('DD MMM')))
const bars = (d, series, colors, f) => (
    <Chart type="bar" height={280} series={series} xAxis={labelsOf(d)} customOptions={{ colors, legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' }, dataLabels: { enabled: false }, plotOptions: { bar: { columnWidth: '50%', borderRadius: 3, borderRadiusApplication: 'end' } }, xaxis: { categories: labelsOf(d), labels: { style: { fontSize: '11px' }, rotate: -45 }, tickAmount: Math.min(d.labels.length, 12) }, yaxis: { labels: { formatter: (v) => (f ? Number(v).toLocaleString('en-US', { notation: 'compact' }) : String(Math.round(v))) } }, tooltip: { y: { formatter: (v) => (f ? f(v) : String(v)) } } }} />
)
const donut = (rows, f) => (rows.length ? <Chart type="donut" height={260} series={rows.map((r) => r.value)} customOptions={{ labels: rows.map((r) => r.name), colors: PALETTE, legend: { position: 'bottom', fontSize: '12px' }, dataLabels: { enabled: false }, tooltip: { y: { formatter: (v) => (f ? f(v) : String(v)) } } }} /> : <Empty />)

const Sales = ({ d }) => {
    const { m } = useFmt(d.currency)
    const s = d.stats
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Stat title="Invoiced" className="bg-sky-100" value={m(s.invoiced)} sub={`${s.count} invoices · avg ${m(s.average)}`} icon={<TbReceipt2 />} />
                <Stat title="Payments received" className="bg-emerald-100" value={m(s.paid)} sub={`${s.payments} payments · ${s.collection}% of invoiced is paid`} icon={<TbCash />} />
                <Stat title="Still to collect" className="bg-purple-100" value={m(s.outstanding)} sub="All open invoices today" icon={<TbHourglass />} />
                <Stat title="Overdue" className={s.overdue ? 'bg-red-100' : 'bg-amber-100'} value={m(s.overdue)} sub={`Tax invoiced ${m(s.tax)}`} icon={<TbAlertTriangle />} />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Block title="Invoiced vs received" className="xl:col-span-2">{bars(d, [{ name: 'Invoiced', data: d.series.invoiced }, { name: 'Received', data: d.series.paid }], ['#3b82f6', '#10b981'], m)}</Block>
                <Block title="Payment methods">{donut(d.byMode.map((x) => ({ name: x.name, value: x.amount })), m)}</Block>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Block title="Top clients" export={{ name: 'top-clients', head: ['Client', 'Invoices', 'Invoiced', 'Paid', 'Due'], rows: d.topClients.map((c) => [c.name, c.invoices, c.invoiced, c.paid, c.due]) }}>
                    <Table><THead><Tr><Th>Client</Th><Th className="text-right">Invoiced</Th><Th className="text-right">Paid</Th><Th className="text-right">Due</Th></Tr></THead><TBody>{d.topClients.map((c) => <Tr key={c.name}><Td className="max-w-[220px] truncate font-semibold">{c.name}</Td><Td className="text-right tabular-nums">{m(c.invoiced)}</Td><Td className="text-right tabular-nums">{m(c.paid)}</Td><Td className={classNames('text-right tabular-nums', c.due > 0 && 'text-red-500')}>{m(c.due)}</Td></Tr>)}</TBody></Table>{!d.topClients.length && <Empty />}
                </Block>
                <Block title="Best-selling items" export={{ name: 'top-items', head: ['Item', 'Quantity', 'Revenue', 'Invoices'], rows: d.topItems.map((i) => [i.name, i.qty, i.revenue, i.invoices]) }}>
                    <Table><THead><Tr><Th>Item</Th><Th className="text-right">Qty</Th><Th className="text-right">Revenue</Th></Tr></THead><TBody>{d.topItems.map((i) => <Tr key={i.name}><Td className="max-w-[260px] truncate font-semibold">{i.name}</Td><Td className="text-right tabular-nums">{i.qty}</Td><Td className="text-right tabular-nums">{m(i.revenue)}</Td></Tr>)}</TBody></Table>{!d.topItems.length && <Empty />}
                </Block>
                <Block title="Receivables ageing (today)" export={{ name: 'ageing', head: ['Age', 'Invoices', 'Amount'], rows: d.aging.map((a) => [a.label, a.count, a.amount]) }}>
                    <Table><THead><Tr><Th>Age</Th><Th className="text-right">Invoices</Th><Th className="text-right">Amount</Th></Tr></THead><TBody>{d.aging.map((a) => <Tr key={a.label}><Td className="font-semibold">{a.label}</Td><Td className="text-right tabular-nums">{a.count}</Td><Td className={classNames('text-right tabular-nums', a.label !== 'Not yet due' && a.amount > 0 && 'text-red-500')}>{m(a.amount)}</Td></Tr>)}</TBody></Table>
                </Block>
                <Block title="Tax invoiced" export={{ name: 'tax', head: ['Tax', 'Rate', 'Amount'], rows: d.tax.map((t) => [t.name, t.rate, t.amount]) }}>
                    <Table><THead><Tr><Th>Tax</Th><Th className="text-right">Rate</Th><Th className="text-right">Amount</Th></Tr></THead><TBody>{d.tax.map((t) => <Tr key={`${t.name}${t.rate}`}><Td className="font-semibold">{t.name}</Td><Td className="text-right">{t.rate}%</Td><Td className="text-right tabular-nums">{m(t.amount)}</Td></Tr>)}</TBody></Table>{!d.tax.length && <Empty />}
                </Block>
            </div>
        </div>
    )
}

const Profit = ({ d }) => {
    const { m } = useFmt(d.currency)
    const s = d.stats
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Stat title="Income" className="bg-emerald-100" value={m(s.income)} sub="Payments received" icon={<TbCash />} />
                <Stat title="Expenses" className="bg-amber-100" value={m(s.expenses)} sub={`${s.expenseCount} expenses, tax included`} icon={<TbReceipt2 />} />
                <Stat title="Net result" className={s.net >= 0 ? 'bg-sky-100' : 'bg-red-100'} value={m(s.net)} sub="Income minus expenses" icon={<TbScale />} />
                <Stat title="Margin" className="bg-purple-100" value={`${s.margin}%`} sub="Net / income" icon={<TbPercentage />} />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Block title="Income vs expenses" className="xl:col-span-2">{bars(d, [{ name: 'Income', data: d.series.income }, { name: 'Expenses', data: d.series.expenses }], ['#10b981', '#f59e0b'], m)}</Block>
                <Block title="Where the money went">{donut(d.byCategory.slice(0, 7).map((c) => ({ name: c.name, value: c.amount })), m)}</Block>
            </div>
            <Block title="Expenses by category" export={{ name: 'expenses-by-category', head: ['Category', 'Expenses', 'Amount', 'Share %'], rows: d.byCategory.map((c) => [c.name, c.count, c.amount, c.share]) }}>
                <Table><THead><Tr><Th>Category</Th><Th className="text-right">Expenses</Th><Th className="text-right">Amount</Th><Th className="text-right">Share</Th></Tr></THead><TBody>{d.byCategory.map((c) => <Tr key={c.name}><Td className="font-semibold">{c.name}</Td><Td className="text-right tabular-nums">{c.count}</Td><Td className="text-right tabular-nums">{m(c.amount)}</Td><Td className="text-right"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-700"><span className="block h-1.5 rounded-full bg-primary" style={{ width: `${c.share}%` }} /></span>{c.share}%</span></Td></Tr>)}</TBody></Table>{!d.byCategory.length && <Empty />}
            </Block>
        </div>
    )
}

const RateTable = ({ title, rows, name }) => (
    <Block title={title} export={{ name, head: [title, 'Leads', 'Converted', 'Lost', 'Rate %'], rows: rows.map((r) => [r.name, r.total, r.converted, r.lost, r.rate]) }}>
        <Table><THead><Tr><Th>{title.replace('By ', '')}</Th><Th className="text-right">Leads</Th><Th className="text-right">Clients</Th><Th className="text-right">Lost</Th><Th className="text-right">Rate</Th></Tr></THead><TBody>{rows.map((r) => <Tr key={r.name}><Td className="font-semibold">{r.name}</Td><Td className="text-right tabular-nums">{r.total}</Td><Td className="text-right tabular-nums">{r.converted}</Td><Td className="text-right tabular-nums">{r.lost}</Td><Td className="text-right font-semibold tabular-nums">{r.rate}%</Td></Tr>)}</TBody></Table>{!rows.length && <Empty />}
    </Block>
)
const Leads = ({ d }) => {
    const s = d.stats
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Stat title="New leads" className="bg-sky-100" value={s.total} sub={`${s.lost} lost · ${s.junk} junk`} icon={<TbTargetArrow />} />
                <Stat title="Became clients" className="bg-emerald-100" value={s.converted} icon={<TbUsersGroup />} />
                <Stat title="Conversion rate" className="bg-purple-100" value={`${s.rate}%`} sub="Of the leads created in this period" icon={<TbTrendingUp />} />
                <Stat title="Time to convert" className="bg-amber-100" value={s.avgDays === null ? '—' : `${s.avgDays} d`} sub="Average, converted leads" icon={<TbClock />} />
            </div>
            <Block title="Leads created vs converted">{bars(d, [{ name: 'Created', data: d.series.created }, { name: 'Converted', data: d.series.converted }], ['#3b82f6', '#10b981'])}</Block>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><RateTable title="By source" rows={d.bySource} name="leads-by-source" /><RateTable title="By status" rows={d.byStatus} name="leads-by-status" /></div>
            <RateTable title="By owner" rows={d.byOwner} name="leads-by-owner" />
        </div>
    )
}

const Support = ({ d }) => {
    const s = d.stats
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Stat title="Tickets" className="bg-sky-100" value={s.total} sub={`${s.open} open · ${s.closed} closed`} icon={<TbLifebuoy />} />
                <Stat title="First response" className="bg-emerald-100" value={s.firstResponseHours === null ? '—' : s.firstResponseHours < 48 ? `${s.firstResponseHours} h` : `${Math.round(s.firstResponseHours / 24)} d`} sub="Average time to the first team reply" icon={<TbClock />} />
                <Stat title="Replies per ticket" className="bg-purple-100" value={s.avgReplies} sub={`${s.replies} replies`} icon={<TbChecklist />} />
                <Stat title="Waiting for a reply" className={s.unanswered ? 'bg-red-100' : 'bg-amber-100'} value={s.unanswered} sub="Open, no team reply yet" icon={<TbAlertTriangle />} />
            </div>
            <Block title="Tickets opened">{bars(d, [{ name: 'Opened', data: d.series.opened }], ['#8b5cf6'])}</Block>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3"><Block title="By department">{donut(d.byDepartment)}</Block><Block title="By priority">{donut(d.byPriority)}</Block><Block title="By status">{donut(d.byStatus)}</Block></div>
        </div>
    )
}

const Work = ({ d }) => {
    const s = d.stats
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Stat title="Tasks completed" className="bg-emerald-100" value={s.completed} sub={`${s.created} created`} icon={<TbChecklist />} />
                <Stat title="Time logged" className="bg-sky-100" value={`${s.hours} h`} icon={<TbClock />} />
                <Stat title="Open tasks" className="bg-purple-100" value={s.openTasks} icon={<TbHourglass />} />
                <Stat title="Overdue tasks" className={s.overdue ? 'bg-red-100' : 'bg-amber-100'} value={s.overdue} icon={<TbAlertTriangle />} />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Block title="Tasks created vs completed" className="xl:col-span-2">{bars(d, [{ name: 'Created', data: d.series.created }, { name: 'Completed', data: d.series.completed }], ['#3b82f6', '#10b981'])}</Block>
                <Block title="Projects by status">{donut(d.projectsByStatus)}</Block>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Block title="Team" export={{ name: 'team-time', head: ['Member', 'Hours', 'Tasks completed'], rows: d.byStaff.map((x) => [x.name, x.hours, x.completed]) }}>
                    <Table><THead><Tr><Th>Member</Th><Th className="text-right">Hours</Th><Th className="text-right">Tasks done</Th></Tr></THead><TBody>{d.byStaff.map((x) => <Tr key={x.name}><Td className="font-semibold">{x.name}</Td><Td className="text-right tabular-nums">{x.hours}</Td><Td className="text-right tabular-nums">{x.completed}</Td></Tr>)}</TBody></Table>{!d.byStaff.length && <Empty />}
                </Block>
                <Block title="Time by project" export={{ name: 'time-by-project', head: ['Project', 'Hours'], rows: d.byProject.map((x) => [x.name, x.hours]) }}>
                    <Table><THead><Tr><Th>Project</Th><Th className="text-right">Hours</Th></Tr></THead><TBody>{d.byProject.map((x) => <Tr key={x.name}><Td className="max-w-[300px] truncate font-semibold">{x.name}</Td><Td className="text-right tabular-nums">{x.hours}</Td></Tr>)}</TBody></Table>{!d.byProject.length && <Empty />}
                </Block>
            </div>
        </div>
    )
}

const VIEW = { sales: Sales, profit: Profit, leads: Leads, support: Support, work: Work }

const Reports = () => {
    const [meta, setMeta] = useState(null)
    const [tab, setTab] = useState(null)
    const [range, setRange] = useState('year')
    const [custom, setCustom] = useState([null, null])
    const [currencyId, setCurrencyId] = useState(null)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => { api('/api/crm/reports').then((m) => { setMeta(m); setTab(m.available[0] || null); setCurrencyId(m.currencies.find((c) => c.isDefault)?.id || m.currencies[0]?.id || null) }).catch((e) => setError(e.message)) }, [])
    const load = useCallback(async () => {
        if (!tab) return
        if (range === 'custom' && !(custom[0] && custom[1])) return
        setData(null); setError('')
        try { setData(await api(`/api/crm/reports/${tab}?${qs({ range, from: custom[0] ? dayjs(custom[0]).format('YYYY-MM-DD') : '', to: custom[1] ? dayjs(custom[1]).format('YYYY-MM-DD') : '', currencyId })}`)) } catch (e) { setError(e.message) }
    }, [tab, range, custom, currencyId])
    useEffect(() => { load() }, [load])
    const View = tab ? VIEW[tab] : null
    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>Reports</h3><p className="text-sm text-gray-500">{data ? `${data.range.label} · ${data.range.from} → ${data.range.to}` : 'Sales, profit, leads, support and time'}</p></div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-44"><Select size="sm" options={RANGES.map(([v, l]) => ({ value: v, label: l }))} value={RANGES.filter(([v]) => v === range).map(([v, l]) => ({ value: v, label: l }))[0]} onChange={(o) => setRange(o.value)} /></div>
                    {range === 'custom' && <div className="w-60"><DatePicker.DatePickerRange size="sm" placeholder="Pick the dates" inputFormat="DD MMM YYYY" separator="→" value={custom[0] && custom[1] ? custom : undefined} onChange={(v) => setCustom(Array.isArray(v) && v[0] && v[1] ? v : [null, null])} /></div>}
                    {meta && meta.currencies.length > 1 && <div className="w-32"><Select size="sm" options={meta.currencies.map((c) => ({ value: c.id, label: c.name }))} value={meta.currencies.filter((c) => c.id === currencyId).map((c) => ({ value: c.id, label: c.name }))[0]} onChange={(o) => setCurrencyId(o.value)} /></div>}
                </div>
            </div>
            {meta && !meta.available.length && <Card><p className="py-10 text-center text-gray-500">Your role does not include any report. Ask an administrator to allow “view all” on invoices, payments, expenses, leads, tickets or tasks.</p></Card>}
            {meta && meta.available.length > 0 && (
                <Tabs value={tab} onChange={setTab}>
                    <Tabs.TabList>{meta.available.map((k) => <Tabs.TabNav key={k} value={k}>{TABS[k]}</Tabs.TabNav>)}</Tabs.TabList>
                </Tabs>
            )}
            <div className="mt-5">
                {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                {!data && !error && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Card key={i}><Skeleton height={70} /></Card>)}</div>}
                {data && View && <View d={data} />}
            </div>
        </Container>
    )
}

export default Reports
