import { useCallback, useEffect, useState } from 'react'
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
import { getResource } from '@/lib/crm/resources'
import { api, qs, useCan } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import RecordDrawer from '../kit/RecordDrawer'
import { useClientLookups, makeMoney } from '../clients/shared'
import { fmtDate } from './shared'

const { Tr, Th, Td, THead, TBody } = Table
export const STATE = {
    active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' },
    expiring: { label: 'About to expire', cls: 'bg-amber-100 text-amber-700' },
    expired: { label: 'Expired', cls: 'bg-red-100 text-red-700' },
    trash: { label: 'Trash', cls: 'bg-gray-200 text-gray-600' },
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
    const [create, setCreate] = useState(false)
    const pageSize = 15

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        setLoading(true)
        try { setData(await api(`/api/crm/sales/contracts?${qs({ query, state, clientId, typeId, pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, state, clientId, typeId, page, sort])
    useEffect(() => { load() }, [load])

    const sortBy = (key) => setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
    const th = (key, label, right) => <Th className={cn('cursor-pointer select-none', right && 'text-right')} onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}</Th>
    const st = data.stats
    const typeOptions = (st.types || []).map((t) => ({ value: t.id, label: t.name }))

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>Contracts</h3><p className="text-sm text-gray-500">Agreements, renewals and what is about to expire</p></div>
                {can('contracts', 'create') && <Button variant="solid" icon={<TbPlus />} onClick={() => setCreate(true)}>New contract</Button>}
            </div>
            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
                {['active', 'expiring', 'expired', 'trash'].map((k) => (
                    <button key={k} type="button" onClick={() => { setState(state === k ? null : k); setPage(1) }} className={cn('rounded-2xl border bg-white p-4 text-left transition dark:bg-gray-800', state === k ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700')}>
                        <div className="text-sm text-gray-500">{STATE[k].label}</div><h3 className="mt-1">{st.counts?.[k] ?? 0}</h3>
                    </button>
                ))}
                <Card bodyClass="p-4"><div className="text-sm text-gray-500">Value of live contracts</div><h3 className="mt-1">{money(st.activeValue, baseCur, { decimals: 0 })}</h3><div className="text-xs text-gray-500">{st.unsigned || 0} not signed yet</div></Card>
            </div>
            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-52"><Select size="sm" isClearable placeholder="All types" options={typeOptions} value={typeOptions.find((o) => o.value === typeId) || null} onChange={(o) => { setTypeId(o ? o.value : null); setPage(1) }} /></div>
                    <div className="w-56"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1) }} /></div>
                    <div className="ml-auto w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder="Search subject, client, type" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead><Tr>{th('subject', 'Subject')}{th('client', 'Client')}{th('type', 'Type')}{th('value', 'Value', true)}{th('dateStart', 'Start')}{th('dateEnd', 'End')}<Th>Signed</Th><Th>Status</Th></Tr></THead>
                        <TBody>
                            {data.list.map((c) => (
                                <Tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/crm/contracts/${c.id}`)}>
                                    <Td className="max-w-[300px] truncate font-semibold heading-text">{c.subject}</Td>
                                    <Td className="max-w-[200px] truncate">{c.client}</Td>
                                    <Td className="max-w-[160px] truncate text-gray-500">{c.type || '—'}</Td>
                                    <Td className="text-right tabular-nums">{money(c.value, baseCur)}</Td>
                                    <Td className="whitespace-nowrap">{fmtDate(c.dateStart)}</Td>
                                    <Td className="whitespace-nowrap">{c.dateEnd ? fmtDate(c.dateEnd) : <span className="text-gray-400">No end</span>}{c.state === 'expiring' && <span className="ml-1.5 text-xs text-amber-600">{c.daysLeft}d</span>}</Td>
                                    <Td><Tag className={c.signed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{c.signed ? 'Yes' : 'No'}</Tag></Td>
                                    <Td><StateTag state={c.state} /></Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">Loading…</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">No contracts found</div>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{data.total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total}` : ''}</span>
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                </div>
            </AdaptiveCard>
            <RecordDrawer resource={getResource('contracts')} open={create} id={null} canEdit onClose={() => setCreate(false)} onSaved={(rec) => rec?.id && navigate(`/crm/contracts/${rec.id}`)} />
        </Container>
    )
}

export default ContractsList
