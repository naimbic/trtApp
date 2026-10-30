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
import { useDocMenu } from './DocMenu'
import { InvoiceHead, DocChart, shortMoney, sumOf } from './InvoiceInsights'
import { tr } from '@/utils/t'
import { moneyChange } from '../kit/widgets'

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

    const doc = useDocMenu({
        path: '/crm/estimates', apiBase: '/api/crm/sales/estimates', perm: 'estimates', name: (r) => `${r.number} · ${r.client}`,
        mail: { kind: 'estimate', template: 'estimate-send-to-client' },
        canEdit: (r) => !r.invoiceId,
        statuses: [[1, 'markDraft'], [2, 'markSent'], [4, 'markAccepted'], [3, 'markDeclined']].map(([st, action]) => ({ label: STATUS[st].label, action, current: (r) => r.status === st })),
        convert: { label: tr("Convert to invoice"), perm: 'invoices', when: (r) => [2, 4, 5].includes(r.status) && !r.invoiceId, url: (r) => `/api/crm/sales/estimates/${r.id}/convert`, to: (res) => res.invoiceId && `/crm/invoices/${res.invoiceId}` },
    }, load)

    const sortBy = (key) => setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
    const th = (key, label, right) => <Th className={cn('cursor-pointer select-none', right && 'text-right')} onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}</Th>
    const m = data.stats.money[cur]
    const tc = (metric, goodUp) => moneyChange(data.stats.trend, cur, metric, goodUp)
    const currencies = Object.keys(data.stats.money)
    useRegisterCurrency(currencies.map((k) => ({ id: k, name: lookups.currencies.find((x) => x.id === k)?.name || '?' })), cur, setCur)

    return (
        <Container>
            <InvoiceHead
                title={tr("Estimates")}
                action={can('estimates', 'create') && <Button variant="solid" icon={<TbPlus />} data-href={'/crm/estimates/new'} onClick={() => navigate('/crm/estimates/new')}>{tr("New estimate")}</Button>}
                stats={[
                    { icon: <TbFileText />, label: tr("Estimates"), value: String(Object.values(data.stats.counts).reduce((a, b) => a + b, 0)) },
                    { icon: <TbHourglass />, label: tr("Waiting for an answer"), value: m ? money(m.open, cur) : '—' },
                    { icon: <TbCircleCheck />, label: tr("Accepted"), value: m ? money(m.accepted, cur) : '—' },
                ]}
            />

            {m && (
                <TileGrid cols={4}>
                    <StatTile title={tr("Waiting for an answer")} change={tc('open')} className="bg-sky-100" value={money(m.open, cur)} icon={<TbHourglass />} />
                    <StatTile title={tr("Accepted")} change={tc('accepted')} className="bg-emerald-100" value={money(m.accepted, cur)} icon={<TbCircleCheck />} />
                    <StatTile title={tr("Estimates")} className="bg-purple-100" value={Object.values(data.stats.counts).reduce((a, b) => a + b, 0)} icon={<TbFileText />} />
                    <StatTile title={tr("Declined")} className="bg-amber-100" value={data.stats.counts[3] || 0} icon={<TbAlertTriangle />} />
                </TileGrid>
            )}

            {m && data.stats.series?.[cur] && <DocChart title={tr("Estimates over time")} sumLabel={tr("sent to clients in this period")} sum={sumOf(data.stats.series[cur], 'estimated')} series={data.stats.series[cur]} money={(v) => money(v, cur)} moneyShort={shortMoney(lookups.currencies, cur)} cfg={[{ key: 'estimated', name: tr("Estimated"), tone: 'tomato' }, { key: 'accepted', name: tr("Accepted"), tone: 'pine', dashed: true }]} />}

            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-60"><RelationSelect size="sm" placeholder={tr("Choose a client")} resource="clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1) }} /></div>
                    <StatusPills inline order={ORDER} labels={Object.fromEntries(ORDER.map((s) => [s, STATUS[s].label]))} counts={data.stats.counts} value={status} onChange={(s) => { setStatus(s); setPage(1) }} />
                    <div className="w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search number, client or reference")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead><Tr>{th('number', tr("Estimate"))}{th('client', tr("Client"))}<Th>{tr("Reference")}</Th>{th('date', tr("Date"))}{th('expiryDate', tr("Valid until"))}{th('total', tr("Amount"), true)}{th('status', tr("Status"))}{doc.head}</Tr></THead>
                        <TBody>
                            {data.list.map((r) => (
                                <Tr key={r.id} className="cursor-pointer" data-href={`/crm/estimates/${r.id}`} onClick={() => navigate(`/crm/estimates/${r.id}`)}>
                                    <Td className="whitespace-nowrap font-semibold heading-text">{r.number}</Td>
                                    <Td className="max-w-[240px] truncate">{r.client}</Td>
                                    <Td className="max-w-[140px] truncate text-gray-500">{r.referenceNo || '—'}</Td>
                                    <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                                    <Td className={cn('whitespace-nowrap', r.status === 5 && 'text-amber-600')}>{fmtDate(r.expiryDate) || '—'}</Td>
                                    <Td className="text-right tabular-nums">{money(r.total, r.currencyId)}</Td>
                                    <Td><StatusTag status={r.status} />{r.invoiced && <span className="ml-1.5 text-xs text-emerald-600">{tr("invoiced")}</span>}</Td>
                                    {doc.cell(r)}
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("No estimates found")}</div>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{data.total ? tr("{v1}–{v2} of {total}", { v1: (page - 1) * pageSize + 1, v2: Math.min(page * pageSize, data.total), total: data.total }) : ''}</span>
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                </div>
            </AdaptiveCard>
            {doc.dialogs}
        </Container>
    )
}

export default EstimatesList
