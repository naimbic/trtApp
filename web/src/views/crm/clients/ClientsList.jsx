import { useCallback, useEffect, useState } from 'react'
import { StatTile, TileGrid } from '@/components/crm/ListHeader'
import { TbBuilding, TbCircleCheck, TbCircleOff, TbUsers } from 'react-icons/tb'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { TbPlus, TbSearch, TbPencil, TbEye } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Pagination from '@/components/ui/Pagination'
import { api, notify, qs, useCan } from '../kit/api'
import { useClientLookups, makeMoney } from './shared'
import { tr } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const Stat = ({ label, value, sub }) => (
    <Card bodyClass="p-4"><div className="text-sm text-gray-500">{label}</div><h3 className="mt-1">{value ?? '–'}</h3>{sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}</Card>
)

const ClientsList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [data, setData] = useState({ list: [], total: 0, stats: {} })
    const [status, setStatus] = useState('active')
    const [groupId, setGroupId] = useState(null)
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize] = useState(15)
    const [sort, setSort] = useState({ key: 'company', order: 'asc' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await api(`/api/crm/customers?${qs({ query, status, groupId, pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`))
            setError('')
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [query, status, groupId, page, pageSize, sort])
    useEffect(() => { load() }, [load])

    const toggle = async (c, active) => {
        setData((d) => ({ ...d, list: d.list.map((x) => (x.id === c.id ? { ...x, active } : x)) }))
        try {
            await api(`/api/crm/customers/${c.id}`, { method: 'PATCH', body: { active } })
            notify('success', `${c.company} ${active ? 'activated' : 'deactivated'}`)
            load()
        } catch (e) {
            setData((d) => ({ ...d, list: d.list.map((x) => (x.id === c.id ? { ...x, active: c.active } : x)) }))
            notify('danger', e.message)
        }
    }

    const sortBy = (key) => setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
    const th = (key, label) => <Th className="cursor-pointer select-none" onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}</Th>
    const s = data.stats || {}
    const groupOptions = lookups.groups.map((g) => ({ value: g.id, label: g.name }))

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr("Clients")}</h3><p className="text-sm text-gray-500">{tr("Companies, contacts and what they owe")}</p></div>
                {can('customers', 'create') && <Button variant="solid" icon={<TbPlus />} onClick={() => navigate('/crm/clients/new')}>{tr("New client")}</Button>}
            </div>
            <TileGrid>
                <StatTile title={tr("Clients")} className="bg-sky-100" value={s.total} icon={<TbBuilding />} />
                <StatTile title={tr("Active")} className="bg-emerald-100" value={s.active} icon={<TbCircleCheck />} />
                <StatTile title={tr("Inactive")} className="bg-amber-100" value={s.inactive} icon={<TbCircleOff />} />
                <StatTile title={tr("Contacts")} className="bg-purple-100" value={s.contacts} sub={tr("{v1} active", { v1: s.activeContacts ?? 0 })} icon={<TbUsers />} />
            </TileGrid>
            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Segment size="sm" value={status} onChange={(v) => { if (v) { setStatus(v); setPage(1) } }}>
                        <Segment.Item value="all">{tr("All")}</Segment.Item><Segment.Item value="active">{tr("Active")}</Segment.Item><Segment.Item value="inactive">{tr("Inactive")}</Segment.Item>
                    </Segment>
                    <div className="w-48"><Select size="sm" isClearable placeholder={tr("All groups")} options={groupOptions} value={groupOptions.find((o) => o.value === groupId) || null} onChange={(o) => { setGroupId(o ? o.value : null); setPage(1) }} /></div>
                    <div className="ml-auto w-full sm:w-72"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search company, contact, phone, VAT…")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead>
                            <Tr>{th('company', tr("Company"))}<Th>{tr("Primary contact")}</Th>{th('phoneNumber', tr("Phone"))}<Th>{tr("Groups")}</Th><Th className="text-right">{tr("Outstanding")}</Th>{th('active', tr("Active"))}{th('createdAt', tr("Created"))}<Th className="text-right">{tr("Actions")}</Th></Tr>
                        </THead>
                        <TBody>
                            {data.list.map((c) => (
                                <Tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/crm/clients/${c.id}`)}>
                                    <Td><div className="flex items-center gap-3">{c.logoUrl ? <img src={c.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-700">{(c.company || '?').slice(0, 2).toUpperCase()}</span>}<div className="min-w-0"><div className="font-semibold heading-text">{c.company}</div><div className="text-xs text-gray-500">{[c.city, c.vat && tr("VAT {vat}", { vat: c.vat })].filter(Boolean).join(' · ')}</div></div></div></Td>
                                    <Td>{c.primaryContact ? <><div>{c.primaryContact.name}</div><div className="text-xs text-gray-500">{c.primaryContact.email}</div></> : <span className="text-gray-400">—</span>}</Td>
                                    <Td className="whitespace-nowrap">{c.phone || c.primaryContact?.phone || <span className="text-gray-400">—</span>}</Td>
                                    <Td><div className="flex flex-wrap gap-1">{c.groups.length ? c.groups.map((g) => <Tag key={g.id}>{g.name}</Tag>) : <span className="text-gray-400">—</span>}</div></Td>
                                    <Td className="text-right tabular-nums">
                                        {Object.entries(c.money).filter(([, m]) => m.outstanding > 0).map(([cid, m]) => <div key={cid} className={m.overdue > 0 ? 'text-red-500' : ''}>{money(m.outstanding, cid, { decimals: 0 })}</div>)}
                                        {!Object.values(c.money).some((m) => m.outstanding > 0) && <span className="text-gray-400">—</span>}
                                    </Td>
                                    <Td onClick={(e) => e.stopPropagation()}>{can('customers', 'edit') ? <Switcher checked={c.active} onChange={(v) => toggle(c, v)} /> : <Tag>{c.active ? tr("Yes") : tr("No")}</Tag>}</Td>
                                    <Td className="whitespace-nowrap text-gray-500">{dayjs(c.createdAt).format('YYYY-MM-DD')}</Td>
                                    <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <Tooltip title={tr("Open")}><Button size="sm" variant="plain" icon={<TbEye />} onClick={() => navigate(`/crm/clients/${c.id}`)} /></Tooltip>
                                        {can('customers', 'edit') && <Tooltip title={tr("Edit")}><Button size="sm" variant="plain" icon={<TbPencil />} onClick={() => navigate(`/crm/clients/${c.id}/edit`)} /></Tooltip>}
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("No clients found")}</div>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{data.total ? tr("{v1}–{v2} of {total}", { v1: (page - 1) * pageSize + 1, v2: Math.min(page * pageSize, data.total), total: data.total }) : ''}</span>
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default ClientsList
