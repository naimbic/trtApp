import { useCallback, useEffect, useState } from 'react'
import { StatTile, TileGrid } from '@/components/crm/ListHeader'
import { TbCash, TbListNumbers, TbCoins, TbExternalLink, TbDownload } from 'react-icons/tb'
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
import { InvoiceHead, DocChart, shortMoney, sumOf } from './InvoiceInsights'
import { useDocMenu } from './DocMenu'
import { useSessionUser } from '@/store/authStore'
import { tr } from '@/utils/t'
import { moneyChange } from '../kit/widgets'

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

    const doc = useDocMenu({
        perm: 'payments',
        items: (p, { navigate: go, can: may }) => [
            { label: tr("Open invoice"), icon: <TbExternalLink />, onClick: () => go(`/crm/invoices/${p.invoiceId}`) },
            { label: tr("Download invoice"), icon: <TbDownload />, onClick: () => { window.location.href = `/api/crm/sales/invoices/${p.invoiceId}/pdf?download=1` } },
            ...(may('payments', 'delete') ? [{ label: tr("Delete payment"), icon: <TbTrash />, danger: true, after: true, onClick: () => setDel(p) }] : []),
        ],
    }, load)
    const chartCur = Object.keys(data.series || {})[0]

    const sortBy = (key) => setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
    const th = (key, label, right) => <Th className={cn('cursor-pointer select-none', right && 'text-right')} onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}</Th>
    const modeOptions = data.modes.map((m) => ({ value: m.id, label: m.name }))

    const authority = useSessionUser((x) => x.user.authority) || []
    const admin = authority.includes('admin') || authority.includes('crm.admin') // administrators confirm in the dialog; the server still refuses everyone else
    const remove = async () => {
        try {
            await api(`/api/crm/sales/payments/${del.id}${admin ? '?force=1' : ''}`, { method: 'DELETE' })
            notify('success', tr("Payment deleted"))
            load()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setDel(null)
        }
    }

    return (
        <Container>
            <InvoiceHead
                title={tr("Payments")}
                stats={[
                    ...Object.entries(data.totals).slice(0, 2).map(([cid, v]) => ({ icon: <TbCoins />, label: tr("Received · {v1}", { v1: lookups.currencies.find((x) => x.id === cid)?.name || '' }), value: money(typeof v === 'object' ? v.total ?? v.amount ?? 0 : v, cid) })),
                    { icon: <TbListNumbers />, label: tr("Payments"), value: String(data.total) },
                ]}
            />
            {Object.keys(data.totals).length > 0 && (
                <TileGrid>
                    {Object.entries(data.totals).map(([cid, v], i) => <StatTile key={cid} title={tr("Received · {v1}", { v1: lookups.currencies.find((x) => x.id === cid)?.name || '' })} className={['bg-emerald-100', 'bg-sky-100', 'bg-amber-100'][i % 3]} change={moneyChange(data.trend, cid)} value={money(v, cid)} icon={<TbCash />} />)}
                    <StatTile title={tr("Payments")} className="bg-purple-100" value={data.total} sub={tr("For the current filters")} icon={<TbListNumbers />} />
                </TileGrid>
            )}
            {chartCur && data.series[chartCur] && <DocChart title={tr("Payments received")} sumLabel={tr("received in this period")} sum={sumOf(data.series[chartCur], 'received')} series={data.series[chartCur]} money={(v) => money(v, chartCur)} moneyShort={shortMoney(lookups.currencies, chartCur)} cfg={[{ key: 'received', name: tr("Received"), tone: 'pine' }]} />}
            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-52"><Select size="sm" isClearable placeholder={tr("All payment modes")} options={modeOptions} value={modeOptions.find((o) => o.value === modeId) || null} onChange={(o) => { setModeId(o ? o.value : null); setPage(1) }} /></div>
                    <div className="w-56"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1) }} /></div>
                    <div className="ml-auto w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search invoice, client, transaction")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead><Tr>{th('paymentDate', tr("Date"))}{th('invoiceNumber', tr("Invoice"))}{th('client', tr("Client"))}{th('mode', tr("Payment mode"))}<Th>{tr("Transaction")}</Th>{th('amount', tr("Amount"), true)}{can('payments', 'delete') && <Th />}{doc.head}</Tr></THead>
                        <TBody>
                            {data.list.map((p) => (
                                <Tr key={p.id} className="cursor-pointer" data-href={`/crm/invoices/${p.invoiceId}`} onClick={() => navigate(`/crm/invoices/${p.invoiceId}`)}>
                                    <Td className="whitespace-nowrap">{fmtDate(p.paymentDate)}</Td>
                                    <Td className="whitespace-nowrap font-semibold heading-text">{p.invoiceNumber}</Td>
                                    <Td className="max-w-[240px] truncate">{p.client}</Td>
                                    <Td>{p.mode}</Td>
                                    <Td className="max-w-[160px] truncate text-gray-500">{p.transactionId}</Td>
                                    <Td className="text-right tabular-nums">{money(p.amount, p.currencyId)}</Td>
                                    {doc.cell(p)}
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("No payments found")}</div>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{data.total ? tr("{v1}–{v2} of {total}", { v1: (page - 1) * pageSize + 1, v2: Math.min(page * pageSize, data.total), total: data.total }) : ''}</span>
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                </div>
            </AdaptiveCard>
            {doc.dialogs}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this payment?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}>
                <p>{del && tr("{v1} on {invoiceNumber} will be removed and the invoice status recalculated.", { v1: money(del.amount, del.currencyId), invoiceNumber: del.invoiceNumber })}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default PaymentsList
