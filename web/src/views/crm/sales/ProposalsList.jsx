import { useCallback, useEffect, useState } from 'react'
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
import { PROPOSAL_STATUS as STATUS, ProposalStatusTag as StatusTag, fmtDate } from './shared'

const { Tr, Th, Td, THead, TBody } = Table
const ORDER = [6, 1, 4, 5, 3, 2, 7]

const ProposalsList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [data, setData] = useState({ list: [], total: 0, stats: { counts: {}, money: {} } })
    const [status, setStatus] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [range, setRange] = useState([null, null])
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
            const d = await api(`/api/crm/sales/proposals?${qs({ query, status, clientId, from: range[0] && dayjs(range[0]).format('YYYY-MM-DD'), to: range[1] && dayjs(range[1]).format('YYYY-MM-DD'), pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`)
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

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>Proposals</h3><p className="text-sm text-gray-500">Offers to clients and leads, and what they answered</p></div>
                {can('proposals', 'create') && <Button variant="solid" icon={<TbPlus />} onClick={() => navigate('/crm/proposals/new')}>New proposal</Button>}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
                {ORDER.map((s) => (
                    <button key={s} type="button" onClick={() => { setStatus(status === s ? null : s); setPage(1) }} className={cn('rounded-2xl border bg-white p-4 text-left transition dark:bg-gray-800', status === s ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700')}>
                        <div className="text-sm text-gray-500">{STATUS[s].label}</div>
                        <h3 className="mt-1">{data.stats.counts[s] || 0}</h3>
                    </button>
                ))}
            </div>

            {m && (
                <Card className="mb-4" bodyClass="p-4">
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                        {currencies.length > 1 && <Segment size="sm" value={cur} onChange={(v) => v && setCur(v)}>{currencies.map((k) => <Segment.Item key={k} value={k}>{lookups.currencies.find((x) => x.id === k)?.name || '?'}</Segment.Item>)}</Segment>}
                        <div><div className="text-xs text-gray-500">Waiting for an answer</div><b>{money(m.open, cur)}</b></div>
                        <div><div className="text-xs text-gray-500">Accepted</div><b className="text-emerald-600">{money(m.accepted, cur)}</b></div>
                        <span className="ml-auto text-xs text-gray-400">For the current filters</span>
                    </div>
                </Card>
            )}

            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-48"><Select size="sm" isClearable placeholder="All statuses" options={ORDER.map((s) => ({ value: s, label: STATUS[s].label }))} value={status ? { value: status, label: STATUS[status].label } : null} onChange={(o) => { setStatus(o ? o.value : null); setPage(1) }} /></div>
                    <div className="w-56"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1) }} /></div>
                    <div className="w-60"><DatePicker.DatePickerRange size="sm" placeholder="Proposal date range" inputFormat="DD MMM YYYY" separator="→" value={range[0] && range[1] ? range : undefined} onChange={(v) => { setRange(Array.isArray(v) && v[0] && v[1] ? v : [null, null]); setPage(1) }} /></div>
                    <div className="ml-auto w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder="Search number, subject or recipient" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead><Tr>{th('number', 'Proposal')}{th('subject', 'Subject')}{th('to', 'For')}{th('date', 'Date')}{th('openTill', 'Open until')}{th('total', 'Amount', true)}{th('status', 'Status')}</Tr></THead>
                        <TBody>
                            {data.list.map((r) => (
                                <Tr key={r.id} className="cursor-pointer" onClick={() => navigate(`/crm/proposals/${r.id}`)}>
                                    <Td className="whitespace-nowrap font-semibold heading-text">{r.number}</Td>
                                    <Td className="max-w-[280px] truncate font-medium">{r.subject}</Td>
                                    <Td className="max-w-[200px] truncate">{r.to} <span className="text-xs text-gray-400">{r.relType === 'lead' ? 'lead' : ''}</span></Td>
                                    <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                                    <Td className={cn('whitespace-nowrap', r.status === 7 && 'text-amber-600')}>{fmtDate(r.openTill) || '—'}</Td>
                                    <Td className="text-right tabular-nums">{money(r.total, r.currencyId)}</Td>
                                    <Td><StatusTag status={r.status} />{r.converted && <span className="ml-1.5 text-xs text-emerald-600">converted</span>}</Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">Loading…</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">No proposals found</div>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{data.total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total}` : ''}</span>
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default ProposalsList
