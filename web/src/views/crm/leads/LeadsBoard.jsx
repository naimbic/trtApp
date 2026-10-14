import { useCallback, useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useNavigate, useParams } from 'react-router'
import { TbPlus, TbSearch, TbLayoutKanban, TbList, TbMail, TbPhone, TbBuilding, TbClockHour4 } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import cn from '@/utils/classNames'
import { api, qs, notify } from '../kit/api'
import { usePageRange } from '@/store/pageFilterStore'
import { People } from '../tasks/shared'
import LeadDrawer from './LeadDrawer'

const { Tr, Th, Td, THead, TBody } = Table
const SHOW = [['', 'Active'], ['lost', 'Lost'], ['junk', 'Junk'], ['converted', 'Converted']]

const LeadCard = ({ l, onOpen }) => (
    <div onClick={() => onOpen(l.id)} className="cursor-pointer space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{l.name}</div>{l.company && <div className="flex items-center gap-1 truncate text-xs text-gray-500"><TbBuilding className="shrink-0" />{l.company}</div>}</div>
            {l.source && <Tag className="shrink-0 !px-1.5 !py-0 text-[10px]">{l.source}</Tag>}
        </div>
        <div className="space-y-0.5 text-xs text-gray-500">
            {l.email && <div className="flex items-center gap-1 truncate"><TbMail className="shrink-0" />{l.email}</div>}
            {l.phone && <div className="flex items-center gap-1"><TbPhone className="shrink-0" />{l.phone}</div>}
        </div>
        <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-gray-400"><TbClockHour4 />{dayjs(l.lastContact || l.createdAt).format('DD MMM')}</span>
            {l.assigned ? <People list={[l.assigned]} size={22} /> : <span className="text-[11px] text-gray-400">Unassigned</span>}
        </div>
    </div>
)

const LeadsBoard = () => {
    const nav = useNavigate()
    const { id: routeId } = useParams()
    const [data, setData] = useState({ statuses: [], can: {}, sources: [], totals: {} })
    const [list, setList] = useState({ list: [], total: 0 })
    const [staff, setStaff] = useState([])
    const [view, setView] = useState(() => { try { return localStorage.getItem('leads.view') || 'board' } catch { return 'board' } })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [mine, setMine] = useState(false)
    const [assigned, setAssigned] = useState(null)
    const [sourceId, setSourceId] = useState(null)
    const [show, setShow] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: !!routeId, id: routeId || null })

    useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t) }, [search])
    useEffect(() => { api('/api/crm/pipeline/leads/lookups').then((l) => setStaff(l.staff)).catch(() => {}) }, [])
    useEffect(() => { if (routeId) setDrawer({ open: true, id: routeId }) }, [routeId])

    const [range] = usePageRange('leads')
    const filters = { from: range[0] ? dayjs(range[0]).format('YYYY-MM-DD') : '', to: range[1] ? dayjs(range[1]).format('YYYY-MM-DD') : '', query, show, mine: mine ? '1' : '', assigned: assigned || '', sourceId: sourceId || '' }
    const load = useCallback(async () => {
        try {
            if (view === 'list') setList(await api(`/api/crm/pipeline/leads?${qs({ ...filters, view: 'list' })}`))
            else setData(await api(`/api/crm/pipeline/leads?${qs(filters)}`))
            setError('')
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [view, query, show, mine, assigned, sourceId, range]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { load() }, [load])

    const setViewSaved = (v) => { setView(v); try { localStorage.setItem('leads.view', v) } catch { /* private mode */ } }
    const more = async (col) => {
        try {
            const r = await api(`/api/crm/pipeline/leads?${qs({ ...filters, statusId: col.id, offset: col.leads.length })}`)
            setData((d) => ({ ...d, statuses: d.statuses.map((c) => (c.id === col.id ? { ...c, leads: [...c.leads, ...r.leads] } : c)) }))
        } catch (e) { notify('danger', e.message) }
    }
    const onDragEnd = async ({ source, destination }) => {
        if (!destination || source.droppableId === 'none' || destination.droppableId === 'none') return
        if (source.droppableId === destination.droppableId && source.index === destination.index) return
        const cols = data.statuses.map((c) => ({ ...c, leads: [...c.leads] }))
        const from = cols.find((c) => c.id === source.droppableId), to = cols.find((c) => c.id === destination.droppableId)
        const [moved] = from.leads.splice(source.index, 1)
        to.leads.splice(destination.index, 0, { ...moved, statusId: to.id, status: to.name })
        if (from !== to) { from.count -= 1; to.count += 1 }
        setData((d) => ({ ...d, statuses: cols }))
        try {
            await api('/api/crm/pipeline/leads/reorder', { method: 'POST', body: { statusId: to.id, ids: to.leads.map((l) => l.id) } })
            if (from !== to) await api('/api/crm/pipeline/leads/reorder', { method: 'POST', body: { statusId: from.id, ids: from.leads.map((l) => l.id) } })
        } catch (e) { notify('danger', e.message); load() }
    }

    const open = (id) => setDrawer({ open: true, id })
    const close = () => { setDrawer((d) => ({ ...d, open: false })); if (routeId) nav('/crm/leads', { replace: true }) }
    const staffOptions = staff.map((s) => ({ value: s.id, label: s.name }))
    const sourceOptions = data.sources?.length ? data.sources.map((s) => ({ value: s.id, label: s.name })) : (list.sources || []).map((s) => ({ value: s.id, label: s.name }))
    const total = view === 'list' ? list.total : data.statuses.reduce((n, c) => n + c.count, 0)

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>Leads</h3><p className="text-sm text-gray-500">{total} lead{total === 1 ? '' : 's'}{show ? ` · ${SHOW.find((s) => s[0] === show)[1].toLowerCase()}` : ''}</p></div>
                <div className="flex items-center gap-2">
                    <Segment value={view} onChange={(v) => setViewSaved(Array.isArray(v) ? v[0] : v)} size="sm">
                        <Segment.Item value="board"><span className="inline-flex items-center gap-1"><TbLayoutKanban />Board</span></Segment.Item>
                        <Segment.Item value="list"><span className="inline-flex items-center gap-1"><TbList />List</span></Segment.Item>
                    </Segment>
                    <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>New lead</Button>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder="Search leads" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-48"><Select size="sm" isClearable placeholder="Any owner" options={staffOptions} value={staffOptions.find((o) => o.value === assigned) || null} onChange={(o) => { setAssigned(o?.value || null); setMine(false) }} /></div>
                <div className="w-48"><Select size="sm" isClearable placeholder="Any source" options={sourceOptions} value={sourceOptions.find((o) => o.value === sourceId) || null} onChange={(o) => setSourceId(o?.value || null)} /></div>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={mine} onChange={(c) => { setMine(c); if (c) setAssigned(null) }} />My leads</label>
                <Segment size="sm" value={show} onChange={(v) => setShow(Array.isArray(v) ? v[0] ?? '' : v ?? '')} className="ml-auto">{SHOW.map(([v, l]) => <Segment.Item key={v || 'active'} value={v}>{l}{v && data.totals?.[v] ? ` (${data.totals[v]})` : ''}</Segment.Item>)}</Segment>
            </div>

            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            {view === 'board' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {data.statuses.map((c) => (
                            <div key={c.id} className="w-72 shrink-0 rounded-xl bg-gray-100/70 p-2 dark:bg-gray-900/40">
                                <div className="mb-1 flex items-center justify-between rounded-lg border-t-4 bg-white px-3 py-2 dark:bg-gray-800" style={{ borderTopColor: c.color }}>
                                    <span className="truncate text-sm font-semibold" title={c.name}>{c.name}</span><span className="rounded-full bg-gray-100 px-2 text-xs text-gray-500 dark:bg-gray-700">{c.count}</span>
                                </div>
                                <Droppable droppableId={c.id}>
                                    {(prov, snap) => (
                                        <div ref={prov.innerRef} {...prov.droppableProps} className={cn('min-h-[100px] space-y-2 rounded-lg p-1 transition', snap.isDraggingOver && 'bg-blue-50 dark:bg-blue-900/10')}>
                                            {c.leads.map((l, i) => (
                                                <Draggable key={l.id} draggableId={l.id} index={i} isDragDisabled={show !== ''}>
                                                    {(p) => <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}><LeadCard l={l} onOpen={open} /></div>}
                                                </Draggable>
                                            ))}
                                            {prov.placeholder}
                                            {!loading && !c.leads.length && <div className="py-6 text-center text-xs text-gray-400">No leads</div>}
                                            {c.leads.length < c.count && <Button size="xs" block onClick={() => more(c)}>Show {Math.min(data.limit || 50, c.count - c.leads.length)} more</Button>}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <Table>
                        <THead><Tr><Th>Name</Th><Th>Company</Th><Th>Email</Th><Th>Phone</Th><Th>Status</Th><Th>Source</Th><Th>Owner</Th><Th>Created</Th></Tr></THead>
                        <TBody>
                            {list.list.map((l) => (
                                <Tr key={l.id} className="cursor-pointer" onClick={() => open(l.id)}>
                                    <Td className="font-semibold">{l.name}</Td><Td>{l.company || '—'}</Td><Td>{l.email || '—'}</Td><Td>{l.phone || '—'}</Td>
                                    <Td><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: l.statusColor || '#94a3b8' }} />{l.status || '—'}</span></Td>
                                    <Td>{l.source || '—'}</Td><Td>{l.assigned?.name || '—'}</Td><Td>{dayjs(l.createdAt).format('DD MMM YYYY')}</Td>
                                </Tr>
                            ))}
                            {!loading && !list.list.length && <Tr><Td colSpan={8} className="py-10 text-center text-gray-500">No leads match</Td></Tr>}
                        </TBody>
                    </Table>
                    {list.total > list.list.length && <div className="p-3 text-center text-xs text-gray-500">Showing the latest {list.list.length} of {list.total}. Use search or filters to narrow down.</div>}
                </div>
            )}

            <LeadDrawer open={drawer.open} id={drawer.id} staff={staff} onClose={close} onChanged={load} />
        </Container>
    )
}

export default LeadsBoard
