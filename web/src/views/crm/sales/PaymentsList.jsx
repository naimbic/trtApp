import { useCallback, useEffect, useState } from 'react'
import { usePageRange } from '@/store/pageFilterStore'
import { useNavigate } from 'react-router'
import { TbSearch, TbTrash } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Tooltip from '@/components/ui/Tooltip'
import cn from '@/utils/classNames'
import { api, notify, qs, useCan } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { useClientLookups, makeMoney } from '../clients/shared'
import { fmtDate } from './shared'

const { Tr, Th, Td, THead, TBody } = Table

const PaymentsList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [data, setData] = useState({ list: [], total: 0, totals: {}, modes: [] })
    const [modeId, setModeId] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [range] = usePageRange('payments')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [sort, setSort] = useState({ key: 'paymentDate', order: 'desc' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [del, setDel] = useState(null)
    const pageSize = 15

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await api(`/api/crm/sales/payments?${qs({ query, modeId, clientId, from: range[0] && dayjs(range[0]).format('YYYY-MM-DD'), to: range[1] && dayjs(range[1]).format('YYYY-MM-DD'), pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`))
            setError('')
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [query, modeId, clientId, range, page, sort])
    useEffect(() => { load() }, [load])

    const sortBy = (key) => setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
    const th = (key, label, right) => <Th className={cn('cursor-pointer select-none', right && 'text-right')} onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}</Th>
    const modeOptions = data.modes.map((m) => ({ value: m.id, label: m.name }))

    const remove = async () => {
        try {
            await api(`/api/crm/sales/payments/${del.id}`, { method: 'DELETE' })
            notify('success', 'Payment deleted')
            load()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setDel(null)
        }
    }

    return (
        <Container>
            <div className="mb-4"><h3>Payments</h3><p className="text-sm text-gray-500">Money received against invoices. Record a payment from the invoice itself.</p></div>
            {Object.keys(data.totals).length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Object.entries(data.totals).map(([cid, v]) => <Card key={cid} bodyClass="p-4"><div className="text-sm text-gray-500">Received · {lookups.currencies.find((x) => x.id === cid)?.name || ''}</div><h3 className="mt-1 text-emerald-600">{money(v, cid)}</h3></Card>)}
                    <Card bodyClass="p-4"><div className="text-sm text-gray-500">Payments</div><h3 className="mt-1">{data.total}</h3></Card>
                </div>
            )}
            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-52"><Select size="sm" isClearable placeholder="All payment modes" options={modeOptions} value={modeOptions.find((o) => o.value === modeId) || null} onChange={(o) => { setModeId(o ? o.value : null); setPage(1) }} /></div>
                    <div className="w-56"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1) }} /></div>
                    <div className="ml-auto w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder="Search invoice, client, transaction" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead><Tr>{th('paymentDate', 'Date')}{th('invoiceNumber', 'Invoice')}{th('client', 'Client')}{th('mode', 'Payment mode')}<Th>Transaction</Th>{th('amount', 'Amount', true)}{can('payments', 'delete') && <Th />}</Tr></THead>
                        <TBody>
                            {data.list.map((p) => (
                                <Tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/crm/invoices/${p.invoiceId}`)}>
                                    <Td className="whitespace-nowrap">{fmtDate(p.paymentDate)}</Td>
                                    <Td className="whitespace-nowrap font-semibold heading-text">{p.invoiceNumber}</Td>
                                    <Td className="max-w-[240px] truncate">{p.client}</Td>
                                    <Td>{p.mode}</Td>
                                    <Td className="max-w-[160px] truncate text-gray-500">{p.transactionId}</Td>
                                    <Td className="text-right tabular-nums">{money(p.amount, p.currencyId)}</Td>
                                    {can('payments', 'delete') && <Td className="text-right" onClick={(e) => e.stopPropagation()}><Tooltip title="Delete payment"><Button size="xs" variant="plain" icon={<TbTrash />} onClick={() => setDel(p)} /></Tooltip></Td>}
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">Loading…</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">No payments found</div>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{data.total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total}` : ''}</span>
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                </div>
            </AdaptiveCard>
            <ConfirmDialog isOpen={!!del} type="danger" title="Delete this payment?" confirmText="Delete" onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}>
                <p>{del && `${money(del.amount, del.currencyId)} on ${del.invoiceNumber} will be removed and the invoice status recalculated.`}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default PaymentsList
