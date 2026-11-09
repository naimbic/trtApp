import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { TbPlus, TbSearch, TbLayoutKanban, TbList, TbListDetails, TbBan, TbUserCheck, TbUserPlus, TbPlug, TbTrash } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Pipeline from '@/components/crm/Pipeline'
import { api, qs, notify } from '../kit/api'
import { usePageRange } from '@/store/pageFilterStore'
import { People } from '../tasks/shared'
import LeadDrawer from './LeadDrawer'
import SavedViews from '@/components/crm/SavedViews'
import BulkBar, { TickBox, runBulk, useSelection } from '@/components/crm/BulkBar'
import { onCreate } from '@/utils/createIntent'
import { tr, trn } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const SHOW = [['', tr("Active")], ['lost', tr("Lost")], ['junk', tr("Junk")], ['converted', tr("Converted")]]

const LeadsBoard = () => {
    const nav = useNavigate()
    const { id: routeId } = useParams()
    const [data, setData] = useState({ statuses: [], can: {}, sources: [], totals: {} })
    const [list, setList] = useState({ list: [], total: 0 })
    const [staff, setStaff] = useState([])
    const [view, setView] = useState(() => { try { return localStorage.getItem('leads.view') || 'board' } catch { return 'board' } })
    const [search, setSearch] = useState('')
    const sel = useSelection()
    const [query, setQuery] = useState('')
    const [mine, setMine] = useState(false)
    const [assigned, setAssigned] = useState(null)
    const [sourceId, setSourceId] = useState(null)
    const [show, setShow] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [delAsk, setDelAsk] = useState(null)
    const [ask, setAsk] = useState(null) // a lead about to be converted
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

    const flag = async (item, action, ok) => { try { await api(`/api/crm/pipeline/leads/${item.id}/flag`, { method: 'POST', body: { action } }); notify('success', ok); load() } catch (e) { notify('danger', e.message) } }
    // change one thing of a lead from the menu: read it, then save it back with that thing changed
    const patch = async (item, change, ok) => {
        try {
            const l = (await api(`/api/crm/pipeline/leads/${item.id}`)).lead
            const keys = ['name', 'doText', 'title', 'company', 'email', 'phone', 'website', 'description', 'address', 'city', 'state', 'zip', 'country', 'sourceId', 'statusId', 'assignedIds', 'isPublic', 'lastContact']
            await api(`/api/crm/pipeline/leads/${item.id}`, { method: 'PUT', body: { ...Object.fromEntries(keys.map((k) => [k, l[k] ?? null])), ...(typeof change === 'function' ? change(l) : change) } })
            notify('success', ok); load()
        } catch (e) { notify('danger', e.message) }
    }
    // the colours and steps of the popup: the lead's stages, its own one highlighted
    const stageOf = (id) => {
        const cur = data.statuses.find((c) => c.leads.some((l) => l.id === id)) || data.statuses.find((c) => String(c.id) === String(drawer.preset?.statusId))
        return { columns: data.statuses.map((c) => ({ id: c.id, name: c.name, color: c.color })), currentId: cur?.id, onPick: id && show === '' ? async (to) => { await moveTo({ id }, to); setDrawer((d) => ({ ...d, k: (d.k || 0) + 1 })) } : undefined }
    }
    const remove = async (item) => { try { await api(`/api/crm/pipeline/leads/${item.id}`, { method: 'DELETE' }); notify('success', tr("Lead deleted")); load() } catch (e) { notify('danger', e.message) } }
    const convert = async (item) => { try { const r = await api(`/api/crm/pipeline/leads/${item.id}/convert`, { method: 'POST', body: { includeNotes: false } }); notify('success', tr("Client created")); nav(`/crm/clients/${r.clientId}`) } catch (e) { notify('danger', e.message) } }
    const moveTo = (item, toId) => {
        const from = data.statuses.find((c) => c.leads.some((l) => l.id === item.id)), to = data.statuses.find((c) => String(c.id) === String(toId))
        if (from && to && from.id !== to.id) onDragEnd({ source: { droppableId: from.id, index: from.leads.findIndex((l) => l.id === item.id) }, destination: { droppableId: to.id, index: to.leads.length } })
    }
    const [bulkDel, setBulkDel] = useState(false)
    const bulk = async (action, value) => { const r = await runBulk('/api/crm/pipeline/leads/bulk', { ids: sel.list(), action, value }); if (r) { sel.clear(); load() } }
    const open = (id) => setDrawer({ open: true, id, preset: null, k: 0 })
    useEffect(() => onCreate('lead', () => setDrawer({ open: true, id: null, preset: null, k: Date.now() })), [])
    const close = () => { setDrawer((d) => ({ ...d, open: false, preset: null })); if (routeId) nav('/crm/leads', { replace: true }) }
    const staffOptions = staff.map((s) => ({ value: s.id, label: s.name }))
    const sourceOptions = data.sources?.length ? data.sources.map((s) => ({ value: s.id, label: s.name, color: s.color })) : (list.sources || []).map((s) => ({ value: s.id, label: s.name, color: s.color }))
    const total = view === 'list' ? list.total : data.statuses.reduce((n, c) => n + c.count, 0)

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div><h3>{tr("Leads")}</h3><p className="text-sm text-gray-500">{trn(total, "lead")}{show ? ` · ${SHOW.find((s) => s[0] === show)[1].toLowerCase()}` : ''}</p></div>
                </div>
                <div className="flex items-center gap-2">
                    <Segment value={view} onChange={(v) => setViewSaved(Array.isArray(v) ? v[0] : v)} size="sm">
                        <Segment.Item value="board"><span className="inline-flex items-center gap-1"><TbLayoutKanban />{tr("Board")}</span></Segment.Item>
                        <Segment.Item value="list"><span className="inline-flex items-center gap-1"><TbList />{tr("List")}</span></Segment.Item>
                    </Segment>
                    <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("New lead")}</Button>
                </div>
            </div>

            {data.forecast?.count > 0 && show === '' && (
                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[[tr('Open pipeline'), data.forecast.open, tr('{n} leads with a value', { n: data.forecast.count })], [tr('Forecast'), data.forecast.weighted, tr('value × chance of winning')], [tr('Expected this month'), data.forecast.month, tr('closing this month, weighted')]].map(([label, n, sub]) => (
                        <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800"><div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div><div className="text-xl font-extrabold tabular-nums">{new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)}{data.currency ? <span className="ms-1 text-sm font-semibold text-gray-400">{data.currency}</span> : null}</div><div className="text-xs text-gray-400">{sub}</div></div>
                    ))}
                </div>
            )}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search leads")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-48"><Select size="sm" isClearable placeholder={tr("Any owner")} options={staffOptions} value={staffOptions.find((o) => o.value === assigned) || null} onChange={(o) => { setAssigned(o?.value || null); setMine(false) }} /></div>
                <div className="w-48"><Select size="sm" isClearable placeholder={tr("Any source")} options={sourceOptions} value={sourceOptions.find((o) => o.value === sourceId) || null} onChange={(o) => setSourceId(o?.value || null)} /></div>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={mine} onChange={(c) => { setMine(c); if (c) setAssigned(null) }} />{tr("My leads")}</label>
                <SavedViews className="ml-auto" page="leads" getState={() => ({ search, assigned, sourceId, mine, show })} applyState={(v) => { setSearch(v.search || ''); setAssigned(v.assigned || null); setSourceId(v.sourceId || null); setMine(!!v.mine); setShow(v.show || '') }} />
                <Segment size="sm" value={show} onChange={(v) => setShow(Array.isArray(v) ? v[0] ?? '' : v ?? '')}>{SHOW.map(([v, l]) => <Segment.Item key={v || 'active'} value={v}>{l}{v && data.totals?.[v] ? ` (${data.totals[v]})` : ''}</Segment.Item>)}</Segment>
            </div>

            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            {view === 'board' ? (
                <Pipeline
                    loading={loading}
                    emptyText={tr("No leads")}
                    money={(n) => `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n || 0)}${data.currency ? ` ${data.currency}` : ''}`}
                    canDrag={() => show === ''}
                    onOpen={(it) => open(it.id)}
                    onAdd={(c) => setDrawer({ open: true, id: null, preset: { statusId: c.id }, k: 0 })}
                    onMoveTo={show === '' ? moveTo : undefined}
                    actions={(it) => (show === '' ? [
                        { label: tr("Assign to"), icon: <TbUserPlus />, sub: staffOptions.map((m) => ({ label: m.label, checked: it.team?.some((x) => x.id === m.value), onClick: () => patch(it, (l) => ({ assignedIds: (l.assignedIds || []).includes(m.value) ? l.assignedIds.filter((x) => x !== m.value) : [...(l.assignedIds || []), m.value] }), tr("Team changed")) })) },
                        { label: tr("Source"), icon: <TbPlug />, sub: sourceOptions.map((m) => ({ label: m.label, color: m.color, checked: it.source === m.value, onClick: () => patch(it, { sourceId: m.value }, tr("Source changed")) })) },
                        { label: tr("Convert to client"), icon: <TbUserCheck />, onClick: () => setAsk(it) },
                        
                        { label: tr("Mark lost"), icon: <TbBan />, after: true, danger: true, onClick: () => flag(it, 'lost', tr("Marked as lost")) },
                        { label: tr("Delete"), icon: <TbTrash />, after: true, danger: true, onClick: () => setDelAsk(it) },
                    ] : [])}
                    onMove={({ from, to, index, fromIndex }) => {
                        onDragEnd({ source: { droppableId: from, index: fromIndex }, destination: { droppableId: to, index } })
                    }}
                    columns={data.statuses.map((c) => ({
                        id: c.id, name: c.name, ...(c.id !== 'none' ? { href: `/crm/status/leads/${c.id}`, hrefTitle: tr("Open the page of this status") } : {}), color: c.color, count: c.count,
                        items: c.leads.map((l) => ({ id: l.id, href: `/crm/leads/${l.id}`, title: l.company || l.name, sub: l.company ? l.name : '', amount: l.value || undefined, date: dayjs(l.lastContact || l.createdAt).format('DD MMM'), todo: l.doText || '', comments: l.notes || 0, label: l.source || l.email || '', labelColor: l.source ? l.sourceColor : null, source: l.sourceId, kicker: `${tr("Lead")} · ${l.company || l.name}`,
                            fields: [{ label: tr("Email"), value: l.email }, { label: tr("Phone"), value: l.phone }, { label: tr("Source"), value: l.source }, { label: tr("Owner"), value: l.assigned?.name }],
                            team: l.assignees || [],
                            people: l.assignees?.length ? <People list={l.assignees} size={26} /> : <span className="text-[11px] opacity-70">{tr("Unassigned")}</span> })),
                        more: c.leads.length < c.count ? { left: Math.min(data.limit || 50, c.count - c.leads.length), onClick: () => more(c) } : null,
                    }))}
                />
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <Table>
                        <THead><Tr><Th><span className="inline-flex items-center"><TickBox label={tr('Select all')} checked={list.list.length > 0 && list.list.every((l) => sel.has(l.id))} onChange={(on) => sel.set(list.list.map((l) => l.id), on)} />{tr("Name")}</span></Th><Th>{tr("Company")}</Th><Th>{tr("Email")}</Th><Th>{tr("Phone")}</Th><Th>{tr("Status")}</Th><Th>{tr("Source")}</Th><Th>{tr("Owner")}</Th><Th>{tr("Created")}</Th></Tr></THead>
                        <TBody>
                            {list.list.map((l) => (
                                <Tr key={l.id} className={`rowsel cursor-pointer ${sel.has(l.id) ? 'is-sel' : ''}`} onClick={(e) => (sel.count > 0 || e.metaKey || e.ctrlKey ? sel.toggle(l.id) : open(l.id))}>
                                    <Td className="font-semibold"><TickBox checked={sel.has(l.id)} onChange={() => sel.toggle(l.id)} />{l.name}</Td><Td>{l.company || '—'}</Td><Td>{l.email || '—'}</Td><Td>{l.phone || '—'}</Td>
                                    <Td><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: l.statusColor || '#94a3b8' }} />{l.status || '—'}</span></Td>
                                    <Td>{l.source || '—'}</Td><Td>{l.assignees?.length ? l.assignees.map((x) => x.name).join(', ') : '—'}</Td><Td>{dayjs(l.createdAt).format('DD MMM YYYY')}</Td>
                                </Tr>
                            ))}
                            {!loading && !list.list.length && <Tr><Td colSpan={8} className="py-10 text-center text-gray-500">{tr("No leads match")}</Td></Tr>}
                        </TBody>
                    </Table>
                    {list.total > list.list.length && <div className="p-3 text-center text-xs text-gray-500">{tr("Showing the latest")} {list.list.length} {tr("of")} {list.total}{tr(". Use search or filters to narrow down.")}</div>}
                </div>
            )}

            <BulkBar
                count={sel.count} onClear={sel.clear}
                actions={[
                    { label: tr('Status'), icon: <TbListDetails />, options: data.statuses.filter((c) => c.id !== 'none').map((c) => ({ label: c.name, color: c.color, onClick: () => bulk('status', c.id) })) },
                    { label: tr('Source'), icon: <TbPlug />, options: sourceOptions.map((o) => ({ label: o.label, color: o.color, onClick: () => bulk('source', o.value) })) },
                    { label: tr('Add owner'), icon: <TbUserPlus />, options: staffOptions.map((o) => ({ label: o.label, onClick: () => bulk('assign', o.value) })) },
                    { label: show === '' ? tr('Mark lost') : tr('Restore'), icon: <TbBan />, onClick: () => bulk(show === '' ? 'lost' : 'restore') },
                    { label: tr('Delete'), icon: <TbTrash />, danger: true, onClick: () => setBulkDel(true) },
                ]}
            />
            <ConfirmDialog isOpen={bulkDel} type="danger" title={tr('Delete {n} leads?', { n: sel.count })} confirmText={tr('Delete')} onClose={() => setBulkDel(false)} onCancel={() => setBulkDel(false)} onConfirm={() => { setBulkDel(false); bulk('delete') }}>
                <p>{tr('Leads converted to a client cannot be deleted; they are skipped.')}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={!!ask} type="info" title={tr("Convert to a client?")} confirmText={tr("Convert")} onClose={() => setAsk(null)} onCancel={() => setAsk(null)} onConfirm={() => { const it = ask; setAsk(null); convert(it) }}>
                <p>{ask?.title}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={!!delAsk} type="danger" title={tr("Delete this lead?")} confirmText={tr("Delete")} onClose={() => setDelAsk(null)} onCancel={() => setDelAsk(null)} onConfirm={() => { const it = delAsk; setDelAsk(null); remove(it) }}>
                <p>{delAsk?.title}</p>
            </ConfirmDialog>
            <LeadDrawer open={drawer.open} id={drawer.id} staff={staff} presets={drawer.preset} refreshKey={drawer.k} stage={stageOf(drawer.id)} onClose={close} onChanged={load} />
        </Container>
    )
}

export default LeadsBoard
