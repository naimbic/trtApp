import { useCallback, useEffect, useState } from 'react'
import { usePageRange } from '@/store/pageFilterStore'
import { StatTile, TileGrid, StatusPills } from '@/components/crm/ListHeader'
import { useRegisterCurrency } from '@/store/pageFilterStore'
import { TbReceipt2, TbCash, TbHourglass, TbAlertTriangle, TbCircleCheck, TbFileText } from 'react-icons/tb'
import { useNavigate } from 'react-router'
import { TbPlus, TbSearch } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import dayjs from 'dayjs'
import cn from '@/utils/classNames'
import { api, qs, useCan } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { useClientLookups, makeMoney } from '../clients/shared'
import { ESTIMATE_STATUS as STATUS, EstimateStatusTag as StatusTag, fmtDate } from './shared'

const { Tr, Th, Td, THead, TBody } = Table
const ORDER = [1, 2, 4, 3, 5]

const EstimatesList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [data, setData] = useState({ list: [], total: 0, stats: { counts: {}, money: {} } })
    const [status, setStatus] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [range] = usePageRange('estimates')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [sort, setSort] = useState({ key: 'date', order: 'desc' })
    const [cur, setCur] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const pageSize = 15

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const d = await api(`/api/crm/sales/estimates?${qs({ query, status, clientId, from: range[0] && dayjs(range[0]).format('YYYY-MM-DD'), to: range[1] && dayjs(range[1]).format('YYYY-MM-DD'), pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`)
            setData(d)
            setCur((c) => c || Object.keys(d.stats.money)[0] || null)
            setError('')
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [query, status, clientId, range, page, sort])
    useEffect(() => { load() }, [load])

    const sortBy = (key) => setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
    const th = (key, label, right) => <Th className={cn('cursor-pointer select-none', right && 'text-right')} onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}</Th>
    const m = data.stats.money[cur]
    const currencies = Object.keys(data.stats.money)
    useRegisterCurrency(currencies.map((k) => ({ id: k, name: lookups.currencies.find((x) => x.id === k)?.name || '?' })), cur, setCur)

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>Estimates</h3><p className="text-sm text-gray-500">Quotes sent to clients and what they answered</p></div>
                {can('estimates', 'create') && <Button variant="solid" icon={<TbPlus />} onClick={() => navigate('/crm/estimates/new')}>New estimate</Button>}
            </div>

            {m && (
                <TileGrid cols={4}>
                    <StatTile title="Waiting for an answer" className="bg-sky-100" value={money(m.open, cur)} icon={<TbHourglass />} />
                    <StatTile title="Accepted" className="bg-emerald-100" value={money(m.accepted, cur)} icon={<TbCircleCheck />} />
                    <StatTile title="Estimates" className="bg-purple-100" value={Object.values(data.stats.counts).reduce((a, b) => a + b, 0)} icon={<TbFileText />} />
                    <StatTile title="Declined" className="bg-amber-100" value={data.stats.counts[3] || 0} icon={<TbAlertTriangle />} />
                </TileGrid>
            )}

            <AdaptiveCard>
                <StatusPills order={ORDER} labels={Object.fromEntries(ORDER.map((s) => [s, STATUS[s].label]))} counts={data.stats.counts} value={status} onChange={(s) => { setStatus(s); setPage(1) }} />
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-56"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1) }} /></div>
                    <div className="ml-auto w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder="Search number, client or reference" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead><Tr>{th('number', 'Estimate')}{th('client', 'Client')}<Th>Reference</Th>{th('date', 'Date')}{th('expiryDate', 'Valid until')}{th('total', 'Amount', true)}{th('status', 'Status')}</Tr></THead>
                        <TBody>
                            {data.list.map((r) => (
                                <Tr key={r.id} className="cursor-pointer" onClick={() => navigate(`/crm/estimates/${r.id}`)}>
                                    <Td className="whitespace-nowrap font-semibold heading-text">{r.number}</Td>
                                    <Td className="max-w-[240px] truncate">{r.client}</Td>
                                    <Td className="max-w-[140px] truncate text-gray-500">{r.referenceNo || '—'}</Td>
                                    <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                                    <Td className={cn('whitespace-nowrap', r.status === 5 && 'text-amber-600')}>{fmtDate(r.expiryDate) || '—'}</Td>
                                    <Td className="text-right tabular-nums">{money(r.total, r.currencyId)}</Td>
                                    <Td><StatusTag status={r.status} />{r.invoiced && <span className="ml-1.5 text-xs text-emerald-600">invoiced</span>}</Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">Loading…</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">No estimates found</div>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{data.total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total}` : ''}</span>
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default EstimatesList
