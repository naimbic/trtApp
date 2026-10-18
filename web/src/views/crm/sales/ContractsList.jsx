import { useCallback, useEffect, useState } from 'react'
import { StatTile, TileGrid, StatusPills } from '@/components/crm/ListHeader'
import { TbFileCertificate, TbClockExclamation, TbCoins, TbSignature } from 'react-icons/tb'
import { useNavigate } from 'react-router'
import { TbPlus, TbSearch } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Pagination from '@/components/ui/Pagination'
import cn from '@/utils/classNames'
import { api, qs, useCan } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { useClientLookups, makeMoney } from '../clients/shared'
import { fmtDate } from './shared'
import { useDocMenu } from './DocMenu'
import { InvoiceHead, DocChart, shortMoney, sumOf } from './InvoiceInsights'
import { tr } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
export const STATE = {
    active: { label: tr("Active"), cls: 'bg-emerald-100 text-emerald-700' },
    expiring: { label: tr("About to expire"), cls: 'bg-amber-100 text-amber-700' },
    expired: { label: tr("Expired"), cls: 'bg-red-100 text-red-700' },
    trash: { label: tr("Trash"), cls: 'bg-gray-200 text-gray-600' },
}
export const StateTag = ({ state }) => <Tag className={STATE[state]?.cls}>{STATE[state]?.label || state}</Tag>

const ContractsList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const baseCur = lookups.currencies.find((c) => c.isDefault)?.id
    const [data, setData] = useState({ list: [], total: 0, stats: { counts: {}, types: [] } })
    const [state, setState] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [typeId, setTypeId] = useState(null)
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [sort, setSort] = useState({ key: 'dateStart', order: 'desc' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const pageSize = 15

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        setLoading(true)
        try { setData(await api(`/api/crm/sales/contracts?${qs({ query, state, clientId, typeId, pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, state, clientId, typeId, page, sort])
    useEffect(() => { load() }, [load])

    const doc = useDocMenu({
        path: '/crm/contracts', apiBase: '/api/crm/sales/contracts', perm: 'contracts', name: (r) => `${r.subject} · ${r.client}`,
        canEdit: (r) => r.state !== 'trash',
        extra: (r, { act }) => [
            ...(can('contracts', 'edit') && r.state !== 'trash' ? [{ label: r.signed ? tr("Mark as unsigned") : tr("Mark as signed"), icon: <TbSignature />, onClick: () => act(() => api(`/api/crm/sales/contracts/${r.id}/actions`, { method: 'POST', body: { action: r.signed ? 'unsign' : 'sign' } }), r.signed ? tr("Marked as unsigned") : tr("Marked as signed")) }] : []),
            ...(can('contracts', 'edit') && r.state === 'trash' ? [{ label: tr("Restore"), icon: <TbFileCertificate />, onClick: () => act(() => api(`/api/crm/sales/contracts/${r.id}/actions`, { method: 'POST', body: { action: 'restore' } }), tr("Restored")) }] : []),
        ],
        remove: (r) => api(`/api/crm/sales/contracts/${r.id}/actions`, { method: 'POST', body: { action: 'trash' } }),
    }, load)

    const sortBy = (key) => setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
    const th = (key, label, right) => <Th className={cn('cursor-pointer select-none', right && 'text-right')} onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}</Th>
    const st = data.stats
    const typeOptions = (st.types || []).map((t) => ({ value: t.id, label: t.name }))

    return (
        <Container>
            <InvoiceHead
                title={tr("Contracts")}
                action={can('contracts', 'create') && <Button variant="solid" icon={<TbPlus />} onClick={() => navigate('/crm/contracts/new')}>{tr("New contract")}</Button>}
                stats={[
                    { icon: <TbFileCertificate />, label: tr("Active"), value: String(data.stats.counts?.active ?? 0), badge: (data.stats.counts?.expiring ?? 0) ? <span className="badge badge--butter">{tr("{n} expiring", { n: data.stats.counts.expiring })}</span> : null },
                    { icon: <TbCoins />, label: tr("Value of live contracts"), value: money(data.stats.activeValue, baseCur, { decimals: 0 }) },
                    { icon: <TbSignature />, label: tr("Waiting for a signature"), value: String(data.stats.unsigned || 0) },
                ]}
            />
            <TileGrid>
                <StatTile title={tr("Active")} className="bg-emerald-100" value={st.counts?.active ?? 0} icon={<TbFileCertificate />} />
                <StatTile title={tr("About to expire")} className={(st.counts?.expiring ?? 0) ? 'bg-amber-100' : 'bg-sky-100'} value={st.counts?.expiring ?? 0} sub={tr("Within 7 days")} icon={<TbClockExclamation />} />
                <StatTile title={tr("Value of live contracts")} className="bg-sky-100" value={money(st.activeValue, baseCur, { decimals: 0 })} icon={<TbCoins />} />
                <StatTile title={tr("Waiting for a signature")} className="bg-purple-100" value={st.unsigned || 0} icon={<TbSignature />} />
            </TileGrid>
            {data.stats.series && <DocChart title={tr("Contract value over time")} sumLabel={tr("started in the last 12 months")} sum={sumOf(data.stats.series, 'value')} series={data.stats.series} money={(v) => money(v, baseCur, { decimals: 0 })} moneyShort={shortMoney(lookups.currencies, baseCur)} cfg={[{ key: 'value', name: tr("Contract value"), tone: 'tomato' }, { key: 'signed', name: tr("Signed"), tone: 'pine', dashed: true }]} />}

            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-52"><Select size="sm" isClearable placeholder={tr("All types")} options={typeOptions} value={typeOptions.find((o) => o.value === typeId) || null} onChange={(o) => { setTypeId(o ? o.value : null); setPage(1) }} /></div>
                    <div className="w-full sm:w-60"><RelationSelect size="sm" placeholder={tr("Choose a client")} resource="clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1) }} /></div>
                    <StatusPills inline order={['active', 'expiring', 'expired', 'trash']} labels={Object.fromEntries(['active', 'expiring', 'expired', 'trash'].map((k) => [k, STATE[k].label]))} counts={st.counts} value={state} onChange={(k) => { setState(k); setPage(1) }} />
                    <div className="w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search subject, client, type")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead><Tr>{th('subject', tr("Subject"))}{th('client', tr("Client"))}{th('type', tr("Type"))}{th('value', tr("Value"), true)}{th('dateStart', tr("Start"))}{th('dateEnd', tr("End"))}<Th>{tr("Signed")}</Th><Th>{tr("Status")}</Th>{doc.head}</Tr></THead>
                        <TBody>
                            {data.list.map((c) => (
                                <Tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/crm/contracts/${c.id}`)}>
                                    <Td className="max-w-[300px] truncate font-semibold heading-text">{c.subject}</Td>
                                    <Td className="max-w-[200px] truncate">{c.client}</Td>
                                    <Td className="max-w-[160px] truncate text-gray-500">{c.type || '—'}</Td>
                                    <Td className="text-right tabular-nums">{money(c.value, baseCur)}</Td>
                                    <Td className="whitespace-nowrap">{fmtDate(c.dateStart)}</Td>
                                    <Td className="whitespace-nowrap">{c.dateEnd ? fmtDate(c.dateEnd) : <span className="text-gray-400">{tr("No end")}</span>}{c.state === 'expiring' && <span className="ml-1.5 text-xs text-amber-600">{c.daysLeft}d</span>}</Td>
                                    <Td><Tag className={c.signed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{c.signed ? tr("Yes") : tr("No")}</Tag></Td>
                                    <Td><StateTag state={c.state} /></Td>
                                    {doc.cell(c)}
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("No contracts found")}</div>}
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

export default ContractsList
