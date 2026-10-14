import { useCallback, useEffect, useState } from 'react'
import { usePageRange } from '@/store/pageFilterStore'
import { Link, useSearchParams } from 'react-router'
import { TbPlus, TbSearch, TbReceipt2, TbFileInvoice, TbCashBanknote, TbRepeat } from 'react-icons/tb'
import dayjs from 'dayjs'
import Chart from '@/components/shared/Chart'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import classNames from '@/utils/classNames'
import { api, qs } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import ExpenseDrawer from './ExpenseDrawer'

const { Tr, Th, Td, THead, TBody } = Table
const STATES = [['', 'All'], ['billable', 'To invoice'], ['invoiced', 'Invoiced'], ['nonbillable', 'Not billable'], ['recurring', 'Recurring']]
const Stat = ({ title, value, className, icon, sub }) => (
    <div className={classNames('flex items-center justify-between rounded-2xl p-4', className)}>
        <div><div className="mb-3 font-bold text-gray-900">{title}</div><h3 className="text-gray-900">{value}</h3>{sub && <div className="mt-1 text-xs text-gray-700">{sub}</div>}</div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-2xl text-white">{icon}</div>
    </div>
)

const ExpensesList = () => {
    const [sp, setSp] = useSearchParams()
    const [data, setData] = useState({ list: [], total: 0, stats: {}, topCategories: [], months: [], lookups: { categories: [], currencies: [], taxes: [], paymentModes: [] }, can: {} })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [state, setState] = useState('')
    const [categoryId, setCategoryId] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [range] = usePageRange('expenses')
    const [page, setPage] = useState(1)
    const [sort, setSort] = useState({ key: 'date', order: 'desc' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: !!sp.get('open'), id: sp.get('open') || null })
    const pageSize = 20

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try {
            setData(await api(`/api/crm/sales/expenses?${qs({ query, state, categoryId: categoryId || '', clientId: clientId || '', from: range[0] ? dayjs(range[0]).format('YYYY-MM-DD') : '', to: range[1] ? dayjs(range[1]).format('YYYY-MM-DD') : '', pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`))
            setError('')
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, state, categoryId, clientId, range, page, sort])
    useEffect(() => { load() }, [load])
    useEffect(() => { const o = sp.get('open'); if (o) { setDrawer({ open: true, id: o }); sp.delete('open'); setSp(sp, { replace: true }) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const cur = data.lookups.currencies.find((c) => c.isDefault) || data.lookups.currencies[0]
    const m = (n, c = cur) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c?.symbol || c?.name || ''}`.trim()
    const curOf = (id) => data.lookups.currencies.find((c) => c.id === id) || cur
    const catOpts = data.lookups.categories.map((c) => ({ value: c.id, label: c.name }))
    const sortBy = (key) => { setSort((s) => ({ key, order: s.key === key && s.order === 'desc' ? 'asc' : 'desc' })); setPage(1) }
    const arrow = (k) => (sort.key === k ? (sort.order === 'desc' ? ' ↓' : ' ↑') : '')
    const open = (id) => setDrawer({ open: true, id })
    const lookups = async () => { const l = await api('/api/crm/sales/expenses/lookups'); setData((d) => ({ ...d, lookups: l })) }
    const maxCat = Math.max(...data.topCategories.map((c) => c.value), 1)

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>Expenses</h3><p className="text-sm text-gray-500">{data.total} expense{data.total === 1 ? '' : 's'} match your filters</p></div>
                {data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>New expense</Button>}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Stat title="Total spent" className="bg-sky-100" value={m(data.stats.total)} sub={`${m(data.stats.tax)} tax included`} icon={<TbReceipt2 />} />
                <Stat title="To invoice" className="bg-purple-100" value={m(data.stats.billable)} sub="Billable, not invoiced yet" icon={<TbCashBanknote />} />
                <Stat title="Invoiced" className="bg-emerald-100" value={m(data.stats.invoiced)} icon={<TbFileInvoice />} />
                <Stat title="Expenses" className="bg-amber-100" value={data.stats.count ?? 0} sub="in this selection" icon={<TbRepeat />} />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <h5 className="mb-2">By month</h5>
                    {data.months.length ? <Chart type="bar" height={220} series={[{ name: 'Spent', data: data.months.map((x) => x.value) }]} xAxis={data.months.map((x) => dayjs(`${x.month}-01`).format('MMM YY'))} customOptions={{ colors: ['#3b82f6'], legend: { show: false }, dataLabels: { enabled: false }, plotOptions: { bar: { columnWidth: '35%', borderRadius: 4, borderRadiusApplication: 'end' } }, tooltip: { y: { formatter: (v) => m(v) } } }} /> : <p className="py-10 text-center text-gray-500">No data for these filters.</p>}
                </Card>
                <Card>
                    <h5 className="mb-4">Top categories</h5>
                    <div className="space-y-3">{data.topCategories.map((c) => <div key={c.id}><div className="mb-1 flex justify-between text-sm"><span className="truncate font-semibold">{c.name}</span><span className="tabular-nums text-gray-500">{m(c.value)}</span></div><div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.value / maxCat) * 100}%` }} /></div></div>)}</div>
                    {!data.topCategories.length && <p className="py-6 text-center text-gray-500">Nothing here yet.</p>}
                </Card>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder="Search name, note, reference" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-52"><Select size="sm" isClearable placeholder="Any category" options={catOpts} value={catOpts.find((o) => o.value === categoryId) || null} onChange={(o) => { setCategoryId(o?.value || null); setPage(1) }} /></div>
                <div className="w-52"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(x) => { setClientId(x || null); setPage(1) }} /></div>
                <Segment size="sm" value={state} onChange={(v) => { setState(Array.isArray(v) ? v[0] ?? '' : v ?? ''); setPage(1) }}>{STATES.map(([v, l]) => <Segment.Item key={v || 'all'} value={v}>{l}</Segment.Item>)}</Segment>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Table hoverable>
                    <THead><Tr><Th className="cursor-pointer" onClick={() => sortBy('date')}>Date{arrow('date')}</Th><Th className="cursor-pointer" onClick={() => sortBy('name')}>Expense{arrow('name')}</Th><Th>Category</Th><Th>Client / project</Th><Th className="cursor-pointer text-right" onClick={() => sortBy('amount')}>Amount{arrow('amount')}</Th><Th className="text-right">With tax</Th><Th>Status</Th></Tr></THead>
                    <TBody>
                        {data.list.map((e) => (
                            <Tr key={e.id} className="cursor-pointer" onClick={() => open(e.id)}>
                                <Td className="whitespace-nowrap">{e.date ? dayjs(e.date).format('DD MMM YYYY') : '—'}</Td>
                                <Td className="max-w-[280px]"><div className="truncate font-semibold heading-text">{e.name}</div>{e.reference && <div className="truncate text-xs text-gray-500">{e.reference}</div>}</Td>
                                <Td>{e.category || '—'}</Td>
                                <Td className="max-w-[220px]">{e.client ? <Link to={`/crm/clients/${e.client.id}`} onClick={(ev) => ev.stopPropagation()} className="block truncate hover:text-primary">{e.client.name}</Link> : '—'}{e.project && <div className="truncate text-xs text-gray-500">{e.project.name}</div>}</Td>
                                <Td className="text-right tabular-nums">{m(e.amount, curOf(e.currencyId))}</Td>
                                <Td className="text-right font-semibold tabular-nums">{m(e.total, curOf(e.currencyId))}</Td>
                                <Td><div className="flex flex-wrap gap-1">{e.invoice ? <Tag className="bg-emerald-100 text-emerald-700">Invoiced</Tag> : e.billable ? <Tag className="bg-purple-100 text-purple-700">To invoice</Tag> : null}{e.recurring && <Tag className="bg-sky-100 text-sky-700"><TbRepeat className="mr-1 inline" />Repeats</Tag>}{e.repeated && <Tag className="bg-gray-100 text-gray-600">Repeated</Tag>}</div></Td>
                            </Tr>
                        ))}
                        {!loading && !data.list.length && <Tr><Td colSpan={7} className="py-10 text-center text-gray-500">No expenses match</Td></Tr>}
                    </TBody>
                </Table>
            </div>
            {data.total > pageSize && <div className="mt-4 flex justify-end"><Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} /></div>}
            <ExpenseDrawer open={drawer.open} id={drawer.id} lookups={data.lookups} onLookups={lookups} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onChanged={load} />
        </Container>
    )
}

export default ExpensesList
