/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { TbPlus, TbSearch, TbChevronDown, TbGripVertical, TbPencil, TbTrash, TbSparkles, TbFolderPlus, TbPackage, TbCheck } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RecordDrawer from '../kit/RecordDrawer'
import { getResource } from '@/lib/crm/resources'
import { api, notify, useCan } from '../kit/api'
import { savedLang, tr } from '@/utils/t'

const COLORS = {
    blue: { dot: 'bg-blue-500', tint: 'bg-blue-50 dark:bg-blue-500/10', ring: 'border-blue-200 dark:border-blue-500/30', text: 'text-blue-700 dark:text-blue-300' },
    sky: { dot: 'bg-sky-500', tint: 'bg-sky-50 dark:bg-sky-500/10', ring: 'border-sky-200 dark:border-sky-500/30', text: 'text-sky-700 dark:text-sky-300' },
    emerald: { dot: 'bg-emerald-500', tint: 'bg-emerald-50 dark:bg-emerald-500/10', ring: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300' },
    amber: { dot: 'bg-amber-500', tint: 'bg-amber-50 dark:bg-amber-500/10', ring: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-300' },
    orange: { dot: 'bg-orange-500', tint: 'bg-orange-50 dark:bg-orange-500/10', ring: 'border-orange-200 dark:border-orange-500/30', text: 'text-orange-700 dark:text-orange-300' },
    red: { dot: 'bg-red-500', tint: 'bg-red-50 dark:bg-red-500/10', ring: 'border-red-200 dark:border-red-500/30', text: 'text-red-700 dark:text-red-300' },
    pink: { dot: 'bg-pink-500', tint: 'bg-pink-50 dark:bg-pink-500/10', ring: 'border-pink-200 dark:border-pink-500/30', text: 'text-pink-700 dark:text-pink-300' },
    violet: { dot: 'bg-violet-500', tint: 'bg-violet-50 dark:bg-violet-500/10', ring: 'border-violet-200 dark:border-violet-500/30', text: 'text-violet-700 dark:text-violet-300' },
    slate: { dot: 'bg-slate-400', tint: 'bg-slate-50 dark:bg-slate-500/10', ring: 'border-slate-200 dark:border-slate-500/30', text: 'text-slate-600 dark:text-slate-300' },
}
const NONE = 'none'
const money = (n, cur) => `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}${cur ? ` ${cur}` : ''}`
const placed = (ids, id, index) => { const rest = ids.filter((x) => x !== id); rest.splice(Math.max(0, Math.min(index, rest.length)), 0, id); return rest }

/** One line of the catalogue: handle to drag, name and description, unit, rate, taxes, the group it belongs to, edit and delete. */
const ItemRow = ({ item, index, board, groupOptions, taxName, canEdit, canDelete, canDrag, onEdit, onDelete, onAssign }) => (
    <Draggable draggableId={item.id} index={index} isDragDisabled={!canDrag}>
        {(p, snap) => (
            <div ref={p.innerRef} {...p.draggableProps} className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 text-sm dark:bg-gray-800 ${snap.isDragging ? 'border-primary shadow-lg' : 'border-gray-100 dark:border-gray-700'}`}>
                <span {...p.dragHandleProps} className={`flex h-7 w-6 shrink-0 items-center justify-center text-lg ${canDrag ? 'cursor-grab text-gray-400 hover:text-gray-600' : 'text-gray-200'}`} title={canDrag ? tr('Drag to reorder or to move to another group') : ''}><TbGripVertical /></span>
                <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => canEdit && onEdit(item)} className="block max-w-full truncate text-start font-semibold heading-text hover:underline">{item.description}</button>
                    {item.longDescription && <div className="truncate text-xs text-gray-500" title={item.longDescription}>{item.longDescription}</div>}
                </div>
                <div className="hidden w-16 shrink-0 text-xs text-gray-500 sm:block">{item.unit}</div>
                <div className="hidden shrink-0 gap-1 md:flex">{[item.taxId, item.tax2Id].filter(Boolean).map((t, i) => <span key={i} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{taxName(t)}</span>)}</div>
                <div className="w-28 shrink-0 text-end font-bold tabular-nums">{money(item.rate, board.currency)}</div>
                <div className="hidden w-36 shrink-0 lg:block">
                    <Select size="xs" isDisabled={!canEdit} isSearchable={false} options={groupOptions} value={groupOptions.find((o) => o.value === (item.groupId || NONE))} onChange={(o) => o && o.value !== (item.groupId || NONE) && onAssign(item, o.value === NONE ? null : o.value)} />
                </div>
                <div className="flex shrink-0 gap-0.5">
                    {canEdit && <Button size="xs" variant="plain" icon={<TbPencil />} aria-label={tr('Edit')} onClick={() => onEdit(item)} />}
                    {canDelete && <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} aria-label={tr('Delete')} onClick={() => onDelete(item)} />}
                </div>
            </div>
        )}
    </Draggable>
)

const ItemsPage = () => {
    const can = useCan()
    const resource = useMemo(() => getResource('items'), [])
    const [board, setBoard] = useState(null)
    const [error, setError] = useState('')
    const [q, setQ] = useState('')
    const [groupFilter, setGroupFilter] = useState('')
    const [open, setOpen] = useState(() => { try { return JSON.parse(localStorage.getItem('items_open') || '[]') } catch { return [] } })
    const [drawer, setDrawer] = useState({ open: false, id: null, groupId: null })
    const [groupDlg, setGroupDlg] = useState(null) // { id?, name, color }
    const [delGroup, setDelGroup] = useState(null)
    const [delItem, setDelItem] = useState(null)
    const [ai, setAi] = useState(null) // { prompt, groupId, count, busy, list, picked }
    const canCreate = can('items', 'create'), canEdit = can('items', 'edit'), canDelete = can('items', 'delete')

    const load = useCallback(() => api('/api/crm/items-board').then((d) => { setBoard(d); setError('') }).catch((e) => setError(e.message)), [])
    useEffect(() => { load() }, [load])
    useEffect(() => { try { localStorage.setItem('items_open', JSON.stringify(open)) } catch { /* the page works without it */ } }, [open])

    if (!can('items', 'view')) return <Navigate to="/access-denied" replace />
    if (error && !board) return <Container><p className="py-10 text-center text-red-500">{error}</p></Container>
    if (!board) return <Container><div className="flex h-40 items-center justify-center"><Spinner size={32} /></div></Container>

    const taxById = Object.fromEntries(board.taxes.map((t) => [t.id, t]))
    const taxName = (id) => (taxById[id] ? `${taxById[id].name}${taxById[id].rate ? ` ${taxById[id].rate}%` : ''}` : '')
    const filtering = !!q.trim() || !!groupFilter
    const match = (i) => !q.trim() || `${i.description} ${i.longDescription} ${i.unit}`.toLowerCase().includes(q.trim().toLowerCase())
    const lists = [...board.groups, { id: NONE, name: tr('No group'), color: 'slate', items: board.ungrouped, none: true }]
        .filter((g) => !groupFilter || g.id === groupFilter)
        .map((g) => ({ ...g, shown: g.items.filter(match) }))
        .filter((g) => !g.none || g.items.length || groupFilter === NONE)
        .filter((g) => !q.trim() || g.shown.length)
    const groupOptions = [...board.groups.map((g) => ({ value: g.id, label: g.name })), { value: NONE, label: tr('No group') }]
    const toggle = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
    const isOpen = (id) => filtering || open.includes(id)

    const post = (url, body, method = 'POST') => api(url, { method, body }).catch((e) => { notify('danger', e.message); load(); throw e })

    const onDragEnd = async (r) => {
        const { source, destination, draggableId, type } = r
        if (!destination || filtering) return
        if (type === 'GROUP') {
            if (destination.index === source.index) return
            const ids = placed(board.groups.map((g) => g.id), draggableId, destination.index)
            setBoard((b) => ({ ...b, groups: ids.map((id) => b.groups.find((g) => g.id === id)) }))
            return post('/api/crm/items-board/reorder', { groups: ids })
        }
        const from = source.droppableId, to = destination.droppableId
        if (from === to && source.index === destination.index) return
        const listOf = (b, id) => (id === NONE ? b.ungrouped : b.groups.find((g) => g.id === id).items)
        const item = listOf(board, from).find((i) => i.id === draggableId)
        const ids = placed(listOf(board, to).filter((i) => i.id !== draggableId).map((i) => i.id), draggableId, destination.index)
        setBoard((b) => {
            const nb = { ...b, groups: b.groups.map((g) => ({ ...g })) }
            const set = (id, arr) => { if (id === NONE) nb.ungrouped = arr; else nb.groups.find((g) => g.id === id).items = arr }
            if (from !== to) set(from, listOf(b, from).filter((i) => i.id !== draggableId))
            const dest = listOf(from === to ? b : nb, to).filter((i) => i.id !== draggableId)
            dest.splice(destination.index, 0, { ...item, groupId: to === NONE ? null : to })
            set(to, dest)
            return nb
        })
        if (to !== NONE && !open.includes(to)) setOpen((o) => [...o, to])
        await post('/api/crm/items-board/reorder', { groupId: to === NONE ? null : to, ids })
    }

    const assign = async (item, groupId) => {
        const target = groupId ? board.groups.find((g) => g.id === groupId) : null
        const ids = [...(target ? target.items : board.ungrouped).map((i) => i.id), item.id]
        await post('/api/crm/items-board/reorder', { groupId, ids })
        notify('success', tr('Moved to {group}', { group: target?.name || tr('No group') }))
        if (groupId && !open.includes(groupId)) setOpen((o) => [...o, groupId])
        load()
    }
    const saveGroup = async () => {
        try { await api('/api/crm/items-board/groups', { method: groupDlg.id ? 'PUT' : 'POST', body: groupDlg }); setGroupDlg(null); load() } catch (e) { notify('danger', e.message) }
    }
    const removeGroup = async () => { const g = delGroup; setDelGroup(null); try { await api(`/api/crm/items-board/groups?id=${g.id}`, { method: 'DELETE' }); notify('success', tr('Group deleted; its items are kept without a group')); load() } catch (e) { notify('danger', e.message) } }
    const removeItem = async () => { const i = delItem; setDelItem(null); try { await api(`/api/crm/items/${i.id}`, { method: 'DELETE' }); load() } catch (e) { notify('danger', e.message) } }

    const askAi = async () => {
        setAi((a) => ({ ...a, busy: true, list: null }))
        try { const r = await api('/api/crm/items-board/ai', { method: 'POST', body: { prompt: ai.prompt, groupId: ai.groupId || null, count: ai.count, language: savedLang() } }); setAi((a) => ({ ...a, busy: false, list: r.items, picked: r.items.map((_, i) => i), currency: r.currency })) } catch (e) { notify('danger', e.message); setAi((a) => ({ ...a, busy: false })) }
    }
    const addPicked = async () => {
        const items = ai.picked.map((i) => ai.list[i])
        try { const r = await api('/api/crm/items-board/bulk', { method: 'POST', body: { groupId: ai.groupId || null, items } }); notify('success', tr('{n} items added', { n: r.created })); if (ai.groupId && !open.includes(ai.groupId)) setOpen((o) => [...o, ai.groupId]); setAi(null); load() } catch (e) { notify('danger', e.message) }
    }
    const total = board.groups.reduce((n, g) => n + g.items.length, board.ungrouped.length)

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3>{tr('Items')}</h3>
                    <p className="text-sm text-gray-500">{tr('The products and services you add to proposals, estimates and invoices')} · {total}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canCreate && <Button icon={<TbSparkles />} onClick={() => setAi({ prompt: '', groupId: groupFilter && groupFilter !== NONE ? groupFilter : '', count: 8 })}>{tr('AI help')}</Button>}
                    {canCreate && <Button icon={<TbFolderPlus />} onClick={() => setGroupDlg({ name: '', color: 'blue' })}>{tr('New group')}</Button>}
                    {canCreate && <Button variant="solid" icon={<TbPlus />} onClick={() => setDrawer({ open: true, id: null, groupId: groupFilter && groupFilter !== NONE ? groupFilter : null })}>{tr('New item')}</Button>}
                </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-72"><Input size="sm" prefix={<TbSearch />} placeholder={tr('Search items')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <div className="w-full sm:w-56"><Select size="sm" isClearable isSearchable={false} placeholder={tr('All groups')} options={groupOptions} value={groupOptions.find((o) => o.value === groupFilter) || null} onChange={(o) => setGroupFilter(o?.value || '')} /></div>
                {filtering && <span className="text-xs text-gray-400">{tr('Dragging is off while a search or a group filter is on')}</span>}
                <button type="button" className="ms-auto text-xs font-semibold text-primary" onClick={() => setOpen(open.length ? [] : lists.map((g) => g.id))}>{open.length ? tr('Collapse all') : tr('Expand all')}</button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="groups" type="GROUP" isDropDisabled={filtering}>
                    {(gp) => (
                        <div ref={gp.innerRef} {...gp.droppableProps} className="space-y-3">
                            {lists.map((g, gi) => {
                                const c = COLORS[g.color] || COLORS.slate
                                const opened = isOpen(g.id)
                                return (
                                    <Draggable key={g.id} draggableId={`g-${g.id}`} index={gi} isDragDisabled={filtering || g.none || !canEdit}>
                                        {(p, snap) => (
                                            <div ref={p.innerRef} {...p.draggableProps} className={`overflow-hidden rounded-2xl border ${c.ring} bg-white dark:bg-gray-800 ${snap.isDragging ? 'shadow-xl' : ''}`}>
                                                <div className={`flex items-center gap-2 px-3 py-2.5 ${c.tint}`}>
                                                    <span {...p.dragHandleProps} className={`text-lg ${g.none || filtering || !canEdit ? 'invisible' : 'cursor-grab text-gray-400'}`}><TbGripVertical /></span>
                                                    <button type="button" onClick={() => toggle(g.id)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                                                        <span className={`h-3 w-3 shrink-0 rounded-full ${c.dot}`} />
                                                        <span className={`truncate font-bold ${c.text}`}>{g.name}</span>
                                                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">{g.shown.length}{g.shown.length !== g.items.length ? `/${g.items.length}` : ''}</span>
                                                        <TbChevronDown className={`ms-auto shrink-0 text-lg text-gray-500 transition ${opened ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {!g.none && canCreate && <Button size="xs" variant="plain" icon={<TbPlus />} aria-label={tr('New item')} onClick={() => setDrawer({ open: true, id: null, groupId: g.id })} />}
                                                    {!g.none && canEdit && <Button size="xs" variant="plain" icon={<TbPencil />} aria-label={tr('Rename or recolour')} onClick={() => setGroupDlg({ id: g.id, name: g.name, color: g.color })} />}
                                                    {!g.none && canDelete && <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} aria-label={tr('Delete the group')} onClick={() => setDelGroup(g)} />}
                                                </div>
                                                <Droppable droppableId={g.id} type="ITEM" isDropDisabled={filtering}>
                                                    {(ip, is) => (
                                                        <div ref={ip.innerRef} {...ip.droppableProps} className={`space-y-1.5 px-3 ${opened ? 'py-3' : 'h-0 overflow-hidden py-0'} ${is.isDraggingOver ? c.tint : ''}`}>
                                                            {opened && g.shown.map((item, idx) => <ItemRow key={item.id} item={item} index={idx} board={board} groupOptions={groupOptions} taxName={taxName} canEdit={canEdit} canDelete={canDelete} canDrag={canEdit && !filtering} onEdit={(i) => setDrawer({ open: true, id: i.id, groupId: null })} onDelete={setDelItem} onAssign={assign} />)}
                                                            {ip.placeholder}
                                                            {opened && !g.shown.length && <p className="py-3 text-center text-sm text-gray-400">{filtering ? tr('No items match') : tr('No items in this group yet: drag some here, or add one.')}</p>}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        )}
                                    </Draggable>
                                )
                            })}
                            {gp.placeholder}
                            {!lists.length && <p className="py-10 text-center text-gray-400"><TbPackage className="mx-auto mb-2 text-3xl" />{tr('No items yet. Add one, or let the AI help write some.')}</p>}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <RecordDrawer resource={resource} open={drawer.open} id={drawer.id} initial={drawer.groupId ? { groupId: drawer.groupId } : {}} canEdit={drawer.id ? canEdit : canCreate} canDelete={false} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onSaved={load} />

            <Dialog isOpen={!!groupDlg} width={420} onClose={() => setGroupDlg(null)} onRequestClose={() => setGroupDlg(null)}>
                <h5 className="mb-3">{groupDlg?.id ? tr('Rename or recolour the group') : tr('New group')}</h5>
                <label className="form-label mb-1 block">{tr('Name')}</label>
                <Input autoFocus value={groupDlg?.name || ''} onChange={(e) => setGroupDlg((g) => ({ ...g, name: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') saveGroup() }} />
                <label className="form-label mb-1 mt-3 block">{tr('Colour')}</label>
                <div className="flex flex-wrap gap-2">{Object.entries(COLORS).map(([k, c]) => <button key={k} type="button" aria-label={k} onClick={() => setGroupDlg((g) => ({ ...g, color: k }))} className={`flex h-8 w-8 items-center justify-center rounded-full ${c.dot} ${groupDlg?.color === k ? 'ring-2 ring-primary ring-offset-2' : ''}`}>{groupDlg?.color === k && <TbCheck className="text-white" />}</button>)}</div>
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setGroupDlg(null)}>{tr('Cancel')}</Button><Button variant="solid" disabled={!groupDlg?.name?.trim()} onClick={saveGroup}>{tr('Save')}</Button></div>
            </Dialog>

            <ConfirmDialog isOpen={!!delGroup} type="danger" title={tr('Delete this group?')} confirmText={tr('Delete')} onClose={() => setDelGroup(null)} onCancel={() => setDelGroup(null)} onConfirm={removeGroup}>
                <p>{delGroup?.name}</p><p className="text-sm text-gray-500">{tr('Its items are kept, without a group.')}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={!!delItem} type="danger" title={tr('Delete this item?')} confirmText={tr('Delete')} onClose={() => setDelItem(null)} onCancel={() => setDelItem(null)} onConfirm={removeItem}>
                <p>{delItem?.description}</p><p className="text-sm text-gray-500">{tr('Documents that already use it keep their lines.')}</p>
            </ConfirmDialog>

            <Dialog isOpen={!!ai} width={720} onClose={() => setAi(null)} onRequestClose={() => setAi(null)}>
                <h5 className="mb-1 flex items-center gap-2"><TbSparkles />{tr('AI help: write items')}</h5>
                <p className="mb-3 text-sm text-gray-500">{tr('Say what you sell. The AI proposes items with a description, a unit and a price; you choose the ones to add.')}</p>
                <Input textArea rows={2} autoFocus value={ai?.prompt || ''} placeholder={tr('For example: SEO services for local businesses, monthly and one-off')} onChange={(e) => setAi((a) => ({ ...a, prompt: e.target.value }))} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="w-56"><Select size="sm" isSearchable={false} placeholder={tr('Add to group…')} isClearable options={board.groups.map((g) => ({ value: g.id, label: g.name }))} value={board.groups.map((g) => ({ value: g.id, label: g.name })).find((o) => o.value === ai?.groupId) || null} onChange={(o) => setAi((a) => ({ ...a, groupId: o?.value || '' }))} /></div>
                    <div className="w-32"><Select size="sm" isSearchable={false} options={[5, 8, 12].map((n) => ({ value: n, label: tr('{n} items', { n }) }))} value={{ value: ai?.count || 8, label: tr('{n} items', { n: ai?.count || 8 }) }} onChange={(o) => setAi((a) => ({ ...a, count: o.value }))} /></div>
                    <Button variant="solid" size="sm" icon={<TbSparkles />} loading={!!ai?.busy} disabled={(ai?.prompt || '').trim().length < 3} onClick={askAi}>{ai?.list ? tr('Write others') : tr('Write items')}</Button>
                </div>
                {ai?.list && (
                    <div className="mt-4 max-h-[46vh] space-y-1.5 overflow-y-auto pe-1">
                        {ai.list.map((x, i) => (
                            <label key={i} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${ai.picked.includes(i) ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-600'}`}>
                                <input type="checkbox" className="mt-1" checked={ai.picked.includes(i)} onChange={() => setAi((a) => ({ ...a, picked: a.picked.includes(i) ? a.picked.filter((p) => p !== i) : [...a.picked, i] }))} />
                                <div className="min-w-0 flex-1">
                                    <input value={x.description} onChange={(e) => setAi((a) => ({ ...a, list: a.list.map((y, j) => (j === i ? { ...y, description: e.target.value } : y)) }))} className="w-full bg-transparent font-semibold outline-none" />
                                    <div className="text-xs text-gray-500">{x.longDescription}</div>
                                </div>
                                <div className="shrink-0 text-end"><input type="number" min="0" value={x.rate} onChange={(e) => setAi((a) => ({ ...a, list: a.list.map((y, j) => (j === i ? { ...y, rate: e.target.value } : y)) }))} className="w-24 rounded-md border border-gray-200 bg-transparent px-1.5 py-0.5 text-end font-bold dark:border-gray-600" /><div className="text-[11px] text-gray-400">{ai.currency} / {x.unit || tr('unit')}</div></div>
                            </label>
                        ))}
                    </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{ai?.list ? tr('Prices are suggestions: check them before you use them.') : ''}</span>
                    <div className="flex gap-2"><Button onClick={() => setAi(null)}>{tr('Close')}</Button>{ai?.list && <Button variant="solid" disabled={!ai.picked.length} onClick={addPicked}>{tr('Add {n} to the catalogue', { n: ai.picked.length })}</Button>}</div>
                </div>
            </Dialog>
        </Container>
    )
}

export default ItemsPage
