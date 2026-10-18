import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { usePageRange, useRegisterCurrency } from '@/store/pageFilterStore'
import { useDashFilters, accentHex } from '@/store/dashFilterStore'
import { TbDownload, TbCash, TbReceipt2, TbTrendingUp, TbAlertTriangle, TbUsersGroup, TbTargetArrow, TbClock, TbLifebuoy, TbChecklist, TbHourglass, TbScale, TbPercentage } from 'react-icons/tb'
import dayjs from 'dayjs'
import Chart from '@/components/shared/Chart'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'
import Card from '@/components/ui/Card'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'
import classNames from '@/utils/classNames'
import { api, qs } from '../kit/api'
import { tr, trn } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const TABS = { sales: tr("Sales"), profit: tr("Profit & expenses"), leads: tr("Leads"), support: tr("Support"), work: tr("Work & time") }
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
        <div className="mb-3 flex items-center justify-between gap-2"><h5>{title}</h5>{ex && <Button size="xs" icon={<TbDownload />} onClick={() => csv(ex.name, ex.head, ex.rows)}>{tr("CSV")}</Button>}</div>
        {children}
    </Card>
)
const Empty = () => <p className="py-8 text-center text-gray-500">{tr("No data for this period.")}</p>

const useFmt = (cur) => useMemo(() => {
    const m = (n, d = 2) => { const v = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); const s = cur?.symbol || cur?.name || ''; return cur?.placement === 'after' ? `${v} ${s}` : `${s ? `${s} ` : ''}${v}` }
    return { m, n: (v) => Number(v || 0).toLocaleString('en-US') }
}, [cur])

const labelsOf = (d) => d.labels.map((l) => (l.length === 7 ? dayjs(`${l}-01`).format('MMM YY') : dayjs(l).format('DD MMM')))
const bars = (d, series, colors, f) => (
    <Chart type="bar" height={280} series={series} xAxis={labelsOf(d)} customOptions={{ colors, legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' }, dataLabels: { enabled: false }, plotOptions: { bar: { columnWidth: '50%', borderRadius: 3, borderRadiusApplication: 'end' } }, xaxis: { categories: labelsOf(d), labels: { style: { fontSize: '11px' }, rotate: -45 }, tickAmount: Math.min(d.labels.length, 12) }, yaxis: { labels: { formatter: (v) => (f ? Number(v).toLocaleString('en-US', { notation: 'compact' }) : String(Math.round(v))) } }, tooltip: { y: { formatter: (v) => (f ? f(v) : String(v)) } } }} />
)
const donut = (rows, f) => (rows.length ? <Chart type="donut" height={260} series={rows.map((r) => r.value)} customOptions={{ labels: rows.map((r) => r.name), colors: PALETTE, legend: { position: 'bottom', fontSize: '12px' }, dataLabels: { enabled: false }, tooltip: { y: { formatter: (v) => (f ? f(v) : String(v)) } } }} /> : <Empty />)

/* ------------------------------------------------------------------ ecommerce-dashboard style layout */
const growth = (cur, prev) => (prev ? Math.round(((cur - prev) / Math.abs(prev)) * 100) : cur > 0 ? 100 : cur < 0 ? -100 : 0) // nothing before: +100%

const Tile = ({ title, value, icon, iconClass, g, active, onClick, compare }) => (
    <button className={classNames('cursor-pointer rounded-2xl p-4 outline-hidden transition duration-150 ltr:text-left rtl:text-right', active && 'bg-white shadow-md dark:bg-gray-900')} onClick={onClick}>
        <div className="relative flex justify-between gap-2 md:flex-col-reverse 2xl:flex-row">
            <div>
                <div className="mb-4 text-sm font-semibold">{title}</div>
                <h3 className="mb-1">{value}</h3>
                <div className="inline-flex flex-wrap items-center gap-1">{g === null || g === undefined ? <span className="text-xs text-gray-400">{tr("no earlier data")}</span> : <><GrowShrinkValue className="font-bold" value={g} suffix="%" positiveIcon="+" negativeIcon="" /><span className="text-xs">{compare}</span></>}</div>
            </div>
            <div className={classNames('flex h-12 max-h-12 min-h-12 w-12 min-w-12 max-w-12 items-center justify-center rounded-full text-2xl text-gray-900', iconClass)}>{icon}</div>
        </div>
    </button>
)

const Overview = ({ d, tiles }) => {
    const [sel, setSel] = useState(0)
    useEffect(() => setSel(0), [d.kind])
    const t = tiles[sel] || tiles[0]
    return (
        <Card>
            <div className="flex items-center justify-between"><h4>{tr("Overview")}</h4><span className="text-sm text-gray-500">{d.range.label}</span></div>
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl bg-gray-100 p-3 md:grid-cols-3 dark:bg-gray-700">
                {tiles.map((x, i) => <Tile key={x.title} {...x} active={sel === i} onClick={() => setSel(i)} compare="vs the period before" />)}
            </div>
            <Chart type="line" height={380}
                series={[{ name: t.title, data: t.series }, ...(t.prevSeries ? [{ name: `${t.title} · previous period`, data: Array.from({ length: t.series.length }, (_, i) => t.prevSeries[i] ?? 0) }] : [])]}
                xAxis={labelsOf(d)}
                customOptions={{
                    legend: { show: !!t.prevSeries, position: 'top', horizontalAlign: 'left', fontSize: '12px' },
                    colors: t.prevSeries ? [t.color, `${t.color}8c`] : [t.color],
                    stroke: t.prevSeries ? { width: [3, 2], curve: 'smooth', dashArray: [0, 6] } : { width: 3, curve: 'smooth' },
                    xaxis: { categories: labelsOf(d), labels: { style: { fontSize: '11px' }, rotate: -45 }, tickAmount: Math.min(d.labels.length, 12) },
                    yaxis: { labels: { formatter: (v) => (t.money ? Number(v).toLocaleString('en-US', { notation: 'compact' }) : String(Math.round(v * 10) / 10)) } },
                    tooltip: { shared: true, y: { formatter: (v) => t.fmt(v) } },
                }} />
        </Card>
    )
}

const Target = ({ title, percent, big, small, hint }) => (
    <Card>
        <h4 className="mb-4">{title}</h4>
        <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col"><h2 className="truncate">{big}{small && <span className="text-base font-bold opacity-60"> {small}</span>}</h2><div className="mt-1 text-sm">{hint}</div></div>
            <Progress percent={Math.max(0, Math.min(100, percent))} width={84} variant="circle" strokeWidth={8} />
        </div>
    </Card>
)

const TopList = ({ title, rows, icon }) => (
    <Card>
        <h4>{title}</h4>
        <div className="mt-4">
            {rows.map((r) => (
                <div key={r.name} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-3"><Avatar className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100" size={44} shape="round" icon={icon} /><div className="min-w-0"><div className="heading-text truncate font-bold" title={r.name}>{r.name}</div><div className="truncate text-xs">{r.sub}</div></div></div>
                    {r.badge !== undefined && <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">{r.badge}</span>}
                </div>
            ))}
            {!rows.length && <Empty />}
        </div>
    </Card>
)

const Split = ({ title, rows, fmt }) => {
    const top = rows.slice(0, 3)
    const total = top.reduce((s, r) => s + r.value, 0) || 1
    const cls = ['bg-sky-200', 'bg-emerald-200', 'bg-orange-200']
    return (
        <Card>
            <h4 className="mb-4">{title}</h4>
            {top.length ? (
                <>
                    <div className="mt-6 flex items-center gap-1">{top.map((r, i) => { const p = Math.round((r.value / total) * 100); return <div key={r.name} className="flex-1" style={{ width: `${p}%` }}><div className={classNames('h-1.5 rounded-full dark:opacity-70', cls[i])} /><div className="heading-text mt-1 font-bold">{p}%</div></div> })}</div>
                    <div className="mt-6 rounded-xl bg-gray-100 p-4 dark:bg-gray-900"><div className="grid" style={{ gridTemplateColumns: `repeat(${top.length}, minmax(0, 1fr))` }}>{top.map((r, i) => <div key={r.name} className="flex flex-col items-center gap-3"><div className={classNames('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-gray-900', cls[i])}>{i + 1}</div><div className="text-center"><h6 className="mb-1 font-bold">{fmt ? fmt(r.value) : r.value}</h6><div className="max-w-[90px] truncate text-xs" title={r.name}>{r.name}</div></div></div>)}</div></div>
                </>
            ) : <Empty />}
        </Card>
    )
}

const Dash = ({ d, tiles, left, right, bottom }) => (
    <div className="flex max-w-full flex-col gap-4 overflow-x-hidden">
        <div className="flex flex-col gap-4 xl:flex-row">
            <div className="flex flex-1 flex-col gap-4"><Overview d={d} tiles={tiles} />{left}</div>
            <div className="flex flex-col gap-4 xl:w-[380px] xl:shrink-0">{right}</div>
        </div>
        {bottom}
    </div>
)

const TableCard = ({ title, head, rows, empty, csvName, csvRows }) => (
    <Card>
        <div className="mb-3 flex items-center justify-between"><h4>{title}</h4>{csvName && <Button size="sm" icon={<TbDownload />} onClick={() => csv(csvName, head.map((h) => h[0]), csvRows)}>{tr("Export")}</Button>}</div>
        <div className="overflow-x-auto"><Table><THead><Tr>{head.map(([h, right]) => <Th key={h} className={right ? 'text-right' : ''}>{h}</Th>)}</Tr></THead><TBody>{rows}</TBody></Table></div>
        {empty && <Empty />}
    </Card>
)
const Dot = ({ color }) => <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: color }} />
const STATUS_COLOR = { Paid: '#10b981', Overdue: '#ef4444', Unpaid: '#f59e0b', 'Partially paid': '#3b82f6' }

const Sales = ({ d }) => {
    const { m } = useFmt(d.currency)
    const accent = accentHex(useDashFilters((x) => x.accent))
    const s = d.stats, p = d.prev || {}
    const tiles = [
        { title: tr("Invoiced"), value: m(s.invoiced, 0), icon: <TbReceipt2 />, iconClass: 'bg-sky-200', g: growth(s.invoiced, p.invoiced), series: d.series.invoiced, prevSeries: d.prevSeries?.invoiced, color: accent, money: true, fmt: m },
        { title: tr("Received"), value: m(s.paid, 0), icon: <TbCash />, iconClass: 'bg-emerald-200', g: growth(s.paid, p.paid), series: d.series.paid, prevSeries: d.prevSeries?.paid, color: '#10b981', money: true, fmt: m },
        { title: tr("Invoices"), value: s.count, icon: <TbReceipt2 />, iconClass: 'bg-purple-200', g: growth(s.count, p.count), series: d.series.count, prevSeries: d.prevSeries?.count, color: '#8b5cf6', fmt: String },
    ]
    return (
        <Dash d={d} tiles={tiles}
            left={
                <TableCard title={tr("Top clients")} head={[[tr("Client")], [tr("Invoiced"), 1], [tr("Paid"), 1], [tr("Due"), 1]]} empty={!d.topClients.length} csvName="top-clients" csvRows={d.topClients.map((c) => [c.name, c.invoiced, c.paid, c.due])}
                    rows={d.topClients.map((c) => <Tr key={c.name}><Td className="max-w-[240px] truncate font-semibold">{c.name}</Td><Td className="text-right tabular-nums">{m(c.invoiced, 0)}</Td><Td className="text-right tabular-nums">{m(c.paid, 0)}</Td><Td className={classNames('text-right tabular-nums', c.due > 0 && 'text-red-500')}>{m(c.due, 0)}</Td></Tr>)} />
            }
            right={<>
                <Target title={tr("Collection")} percent={s.collection} big={`${s.collection}%`} small="paid" hint={tr("{v1} still to collect, {v2} overdue", { v1: m(s.outstanding, 0), v2: m(s.overdue, 0) })} />
                <TopList title={tr("Best-selling items")} icon={<TbReceipt2 />} rows={d.topItems.slice(0, 5).map((i) => ({ name: i.name, sub: `${tr('Sold')}: ${i.qty} · ${trn(i.invoices, 'invoice')}`, badge: m(i.revenue, 0) }))} />
                <Split title={tr("Payment methods")} rows={d.byMode.map((x) => ({ name: x.name, value: x.amount }))} fmt={(v) => m(v, 0)} />
            </>}
            bottom={<>
                <TableCard title={tr("Latest invoices")} head={[[tr("Invoice")], [tr("Client")], [tr("Date")], [tr("Due")], [tr("Total"), 1], [tr("Status")]]} empty={!d.recent.length}
                    rows={d.recent.map((i) => <Tr key={i.id}><Td><Link className="font-semibold hover:text-primary" to={`/crm/invoices/${i.id}`}>{i.number}</Link></Td><Td className="max-w-[220px] truncate">{i.client}</Td><Td>{dayjs(i.date).format('DD MMM YYYY')}</Td><Td>{i.dueDate ? dayjs(i.dueDate).format('DD MMM YYYY') : '—'}</Td><Td className="text-right tabular-nums">{m(i.total)}</Td><Td><span className="inline-flex items-center font-semibold" style={{ color: STATUS_COLOR[i.status] }}><Dot color={STATUS_COLOR[i.status]} />{i.status}</span></Td></Tr>)} />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <TableCard title={tr("Receivables ageing (today)")} head={[[tr("Age")], [tr("Invoices"), 1], [tr("Amount"), 1]]} csvName="ageing" csvRows={d.aging.map((a) => [a.label, a.count, a.amount])} rows={d.aging.map((a) => <Tr key={a.label}><Td className="font-semibold">{a.label}</Td><Td className="text-right tabular-nums">{a.count}</Td><Td className={classNames('text-right tabular-nums', a.label !== 'Not yet due' && a.amount > 0 && 'text-red-500')}>{m(a.amount)}</Td></Tr>)} />
                    <TableCard title={tr("Tax invoiced")} head={[[tr("Tax")], [tr("Rate"), 1], [tr("Amount"), 1]]} empty={!d.tax.length} csvName="tax" csvRows={d.tax.map((t) => [t.name, t.rate, t.amount])} rows={d.tax.map((t) => <Tr key={`${t.name}${t.rate}`}><Td className="font-semibold">{t.name}</Td><Td className="text-right">{t.rate}%</Td><Td className="text-right tabular-nums">{m(t.amount)}</Td></Tr>)} />
                </div>
            </>}
        />
    )
}

const Profit = ({ d }) => {
    const { m } = useFmt(d.currency)
    const s = d.stats, p = d.prev || {}
    const tiles = [
        { title: tr("Income"), value: m(s.income, 0), icon: <TbCash />, iconClass: 'bg-emerald-200', g: growth(s.income, p.income), series: d.series.income, prevSeries: d.prevSeries?.income, color: '#10b981', money: true, fmt: m },
        { title: tr("Expenses"), value: m(s.expenses, 0), icon: <TbReceipt2 />, iconClass: 'bg-amber-200', g: growth(s.expenses, p.expenses), series: d.series.expenses, prevSeries: d.prevSeries?.expenses, color: '#f59e0b', money: true, fmt: m },
        { title: tr("Net result"), value: m(s.net, 0), icon: <TbScale />, iconClass: 'bg-sky-200', g: growth(s.net, p.net), series: d.series.net, prevSeries: d.prevSeries?.net, color: '#3b82f6', money: true, fmt: m },
    ]
    return (
        <Dash d={d} tiles={tiles}
            left={
                <TableCard title={tr("Expenses by category")} head={[[tr("Category")], [tr("Expenses"), 1], [tr("Amount"), 1], [tr("Share"), 1]]} empty={!d.byCategory.length} csvName="expenses-by-category" csvRows={d.byCategory.map((c) => [c.name, c.count, c.amount, c.share])}
                    rows={d.byCategory.map((c) => <Tr key={c.name}><Td className="font-semibold">{c.name}</Td><Td className="text-right tabular-nums">{c.count}</Td><Td className="text-right tabular-nums">{m(c.amount, 0)}</Td><Td className="text-right"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-700"><span className="block h-1.5 rounded-full bg-primary" style={{ width: `${c.share}%` }} /></span>{c.share}%</span></Td></Tr>)} />
            }
            right={<>
                <Target title={tr("Margin")} percent={s.margin} big={`${s.margin}%`} small="of income" hint={tr("{v1} left after {expenseCount} expenses", { v1: m(s.net, 0), expenseCount: s.expenseCount })} />
                <TopList title={tr("Biggest cost centres")} icon={<TbReceipt2 />} rows={d.byCategory.slice(0, 5).map((c) => ({ name: c.name, sub: trn(c.count, 'expense'), badge: `${c.share}%` }))} />
                <Split title={tr("Income and expenses")} rows={[{ name: 'Income', value: s.income }, { name: 'Expenses', value: s.expenses }]} fmt={(v) => m(v, 0)} />
            </>}
            bottom={
                <TableCard title={tr("Largest expenses")} head={[[tr("Date")], [tr("Expense")], [tr("Category")], [tr("Reference")], [tr("Amount"), 1]]} empty={!d.recent.length}
                    rows={d.recent.map((e) => <Tr key={e.id}><Td className="whitespace-nowrap">{dayjs(e.date).format('DD MMM YYYY')}</Td><Td className="max-w-[260px] truncate font-semibold">{e.name}</Td><Td>{e.category}</Td><Td className="text-gray-500">{e.reference || '—'}</Td><Td className="text-right font-semibold tabular-nums">{m(e.total)}</Td></Tr>)} />
            }
        />
    )
}

const Leads = ({ d }) => {
    const s = d.stats, p = d.prev || {}
    const tiles = [
        { title: tr("New leads"), value: s.total, icon: <TbTargetArrow />, iconClass: 'bg-sky-200', g: growth(s.total, p.total), series: d.series.created, prevSeries: d.prevSeries?.created, color: '#3b82f6', fmt: String },
        { title: tr("Became clients"), value: s.converted, icon: <TbUsersGroup />, iconClass: 'bg-emerald-200', g: growth(s.converted, p.converted), series: d.series.converted, prevSeries: d.prevSeries?.converted, color: '#10b981', fmt: String },
        { title: tr("Lost"), value: s.lost, icon: <TbAlertTriangle />, iconClass: 'bg-orange-200', g: growth(s.lost, p.lost), series: d.series.lost, prevSeries: d.prevSeries?.lost, color: '#f97316', fmt: String },
    ]
    const rate = (rows) => rows.slice(0, 6).map((r) => <Tr key={r.name}><Td className="font-semibold">{r.name}</Td><Td className="text-right tabular-nums">{r.total}</Td><Td className="text-right tabular-nums">{r.converted}</Td><Td className="text-right tabular-nums">{r.lost}</Td><Td className="text-right font-semibold tabular-nums">{r.rate}%</Td></Tr>)
    return (
        <Dash d={d} tiles={tiles}
            left={<TableCard title={tr("By source")} head={[[tr("Source")], [tr("Leads"), 1], [tr("Clients"), 1], [tr("Lost"), 1], [tr("Rate"), 1]]} empty={!d.bySource.length} csvName="leads-by-source" csvRows={d.bySource.map((r) => [r.name, r.total, r.converted, r.lost, r.rate])} rows={rate(d.bySource)} />}
            right={<>
                <Target title={tr("Conversion")} percent={s.rate} big={`${s.rate}%`} small="of new leads" hint={s.avgDays === null ? tr("No conversion in this period") : tr("Average {avgDays} days to convert", { avgDays: s.avgDays })} />
                <TopList title={tr("Owners")} icon={<TbUsersGroup />} rows={d.byOwner.slice(0, 5).map((o) => ({ name: o.name, sub: tr("{converted} became clients", { converted: o.converted }), badge: o.total }))} />
                <Split title={tr("Where the leads are")} rows={d.byStatus.map((x) => ({ name: x.name, value: x.total }))} />
            </>}
            bottom={
                <TableCard title={tr("Latest leads")} head={[[tr("Lead")], [tr("Source")], [tr("Status")], [tr("Owner")], [tr("Created")]]} empty={!d.recent.length}
                    rows={d.recent.map((l) => <Tr key={l.id}><Td><Link className="font-semibold hover:text-primary" to={`/crm/leads/${l.id}`}>{l.name}</Link>{l.company && <div className="text-xs text-gray-500">{l.company}</div>}</Td><Td>{l.source}</Td><Td>{l.converted ? <span className="font-semibold text-emerald-600">{tr("Client")}</span> : l.status}</Td><Td>{l.owner}</Td><Td className="whitespace-nowrap">{dayjs(l.date).format('DD MMM YYYY')}</Td></Tr>)} />
            }
        />
    )
}

const Support = ({ d }) => {
    const s = d.stats, p = d.prev || {}
    const tiles = [
        { title: tr("Tickets"), value: s.total, icon: <TbLifebuoy />, iconClass: 'bg-sky-200', g: growth(s.total, p.total), series: d.series.opened, prevSeries: d.prevSeries?.opened, color: '#8b5cf6', fmt: String },
        { title: tr("Replies"), value: s.replies, icon: <TbChecklist />, iconClass: 'bg-emerald-200', g: growth(s.replies, p.replies), series: d.series.replies, prevSeries: d.prevSeries?.replies, color: '#10b981', fmt: String },
        { title: tr("Closed"), value: s.closed, icon: <TbCash />, iconClass: 'bg-purple-200', g: growth(s.closed, p.closed), series: d.series.closed, prevSeries: d.prevSeries?.closed, color: '#3b82f6', fmt: String },
    ]
    const answered = s.total ? Math.round(((s.total - s.unanswered) / s.total) * 100) : 100
    const fr = s.firstResponseHours === null ? '—' : s.firstResponseHours < 48 ? `${s.firstResponseHours} h` : `${Math.round(s.firstResponseHours / 24)} d`
    return (
        <Dash d={d} tiles={tiles}
            left={<Card><h4 className="mb-2">{tr("By department")}</h4>{donut(d.byDepartment)}</Card>}
            right={<>
                <Target title={tr("Answered")} percent={answered} big={fr} small={tr('first reply')} hint={`${trn(s.unanswered, 'open ticket')} ${tr('without a team reply')}`} />
                <TopList title={tr("By status")} icon={<TbLifebuoy />} rows={d.byStatus.slice(0, 5).map((x) => ({ name: x.name, sub: 'tickets', badge: x.value }))} />
                <Split title={tr("By priority")} rows={d.byPriority} />
            </>}
            bottom={
                <TableCard title={tr("Latest tickets")} head={[['#'], [tr("Subject")], [tr("Client")], [tr("Department")], [tr("Status")], [tr("Opened")]]} empty={!d.recent.length}
                    rows={d.recent.map((t) => <Tr key={t.id}><Td className="text-gray-500">{t.number}</Td><Td className="max-w-[300px] truncate"><Link className="font-semibold hover:text-primary" to={`/crm/tickets/${t.id}`}>{t.subject}</Link></Td><Td className="max-w-[200px] truncate">{t.client}</Td><Td>{t.department}</Td><Td>{t.status}</Td><Td className="whitespace-nowrap">{dayjs(t.date).format('DD MMM YYYY')}</Td></Tr>)} />
            }
        />
    )
}

const Work = ({ d }) => {
    const s = d.stats, p = d.prev || {}
    const tiles = [
        { title: tr("Completed"), value: s.completed, icon: <TbChecklist />, iconClass: 'bg-emerald-200', g: growth(s.completed, p.completed), series: d.series.completed, prevSeries: d.prevSeries?.completed, color: '#10b981', fmt: String },
        { title: tr("Created"), value: s.created, icon: <TbTargetArrow />, iconClass: 'bg-sky-200', g: growth(s.created, p.created), series: d.series.created, prevSeries: d.prevSeries?.created, color: '#3b82f6', fmt: String },
        { title: tr("Hours logged"), value: `${s.hours} h`, icon: <TbClock />, iconClass: 'bg-purple-200', g: growth(s.hours, p.hours), series: d.series.hours, prevSeries: d.prevSeries?.hours, color: '#8b5cf6', fmt: (v) => `${v} h` },
    ]
    const onTime = s.openTasks ? Math.round(((s.openTasks - s.overdue) / s.openTasks) * 100) : 100
    return (
        <Dash d={d} tiles={tiles}
            left={<TableCard title={tr("Time by project")} head={[[tr("Project")], [tr("Hours"), 1]]} empty={!d.byProject.length} csvName="time-by-project" csvRows={d.byProject.map((x) => [x.name, x.hours])} rows={d.byProject.map((x) => <Tr key={x.name}><Td className="max-w-[360px] truncate font-semibold">{x.name}</Td><Td className="text-right tabular-nums">{x.hours}</Td></Tr>)} />}
            right={<>
                <Target title={tr("On schedule")} percent={onTime} big={`${onTime}%`} small="of open tasks" hint={tr("{overdue} overdue of {openTasks} open", { overdue: s.overdue, openTasks: s.openTasks })} />
                <TopList title={tr("Team")} icon={<TbUsersGroup />} rows={d.byStaff.slice(0, 5).map((x) => ({ name: x.name, sub: `${trn(x.completed, 'task')} ${tr('done')}`, badge: `${x.hours} h` }))} />
                <Split title={tr("Projects by status")} rows={d.projectsByStatus} />
            </>}
            bottom={
                <TableCard title={tr("Overdue tasks")} head={[[tr("Task")], [tr("Project")], [tr("Assigned")], [tr("Due")], [tr("Late"), 1]]} empty={!d.recent.length}
                    rows={d.recent.map((t) => <Tr key={t.id}><Td className="max-w-[320px] truncate"><Link className="font-semibold hover:text-primary" to={`/crm/tasks-board?task=${t.id}`}>{t.name}</Link></Td><Td className="max-w-[220px] truncate">{t.project || '—'}</Td><Td>{t.who || '—'}</Td><Td className="whitespace-nowrap">{dayjs(t.due).format('DD MMM YYYY')}</Td><Td className="text-right font-semibold text-red-500">{t.days} d</Td></Tr>)} />
            }
        />
    )
}

const VIEW = { sales: Sales, profit: Profit, leads: Leads, support: Support, work: Work }

const Reports = () => {
    const [meta, setMeta] = useState(null)
    const [tab, setTab] = useState(null)
    const [dates] = usePageRange('reports', 'year')
    const [currencyId, setCurrencyId] = useState(null)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => { api('/api/crm/reports').then((m) => { setMeta(m); setTab(m.available[0] || null); setCurrencyId(m.currencies.find((c) => c.isDefault)?.id || m.currencies[0]?.id || null) }).catch((e) => setError(e.message)) }, [])
    const load = useCallback(async () => {
        if (!tab) return
        setData(null); setError('')
        try { setData(await api(`/api/crm/reports/${tab}?${qs({ range: 'custom', from: dayjs(dates[0] || '2015-01-01').format('YYYY-MM-DD'), to: dayjs(dates[1] || new Date()).format('YYYY-MM-DD'), currencyId })}`)) } catch (e) { setError(e.message) }
    }, [tab, dates, currencyId])
    useEffect(() => { load() }, [load])
    useRegisterCurrency(meta && meta.currencies.length > 1 ? meta.currencies.map((c) => ({ id: c.id, name: c.name })) : [], currencyId, setCurrencyId)
    const View = tab ? VIEW[tab] : null
    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex flex-wrap items-baseline gap-3">{tr("Reports")}<span className="text-sm font-normal text-gray-500">{data ? `${data.range.from} → ${data.range.to}` : tr("Sales, profit, leads, support and time")}</span></h3>
                
            </div>
            {meta && !meta.available.length && <Card><p className="py-10 text-center text-gray-500">{tr("Your role does not include any report. Ask an administrator to allow “view all” on invoices, payments, expenses, leads, tickets or tasks.")}</p></Card>}
            {meta && meta.available.length > 0 && (
                <Tabs value={tab} onChange={setTab}>
                    <Tabs.TabList>{meta.available.map((k) => <Tabs.TabNav key={k} value={k}>{TABS[k]}</Tabs.TabNav>)}</Tabs.TabList>
                </Tabs>
            )}
            <div className="mt-5">
                {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                {!data && !error && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Card key={i}><Skeleton height={70} /></Card>)}</div>}
                {data && data.kind === tab && View && <View d={data} />}
            </div>
        </Container>
    )
}

export default Reports
