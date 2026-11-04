/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { TbChevronDown, TbGripVertical, TbPencil, TbPlus, TbTrash, TbCheck } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { tr } from '@/utils/t'

export const COLORS = {
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
export const NONE = 'none'
export const colorOf = (c) => (COLORS[c] ? c : 'slate')

/** The Dialog to create or rename a group and choose its colour; `extra` adds fields of its own (a contract type has a length...). */
export const GroupDialog = ({ value, onChange, onSave, onClose, title, extra }) => (
    <Dialog isOpen={!!value} width={440} onClose={onClose} onRequestClose={onClose}>
        <h5 className="mb-3">{title}</h5>
        <label className="form-label mb-1 block">{tr('Name')}</label>
        <Input autoFocus value={value?.name || ''} onChange={(e) => onChange({ ...value, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') onSave() }} />
        <label className="form-label mb-1 mt-3 block">{tr('Colour')}</label>
        <div className="flex flex-wrap gap-2">{Object.entries(COLORS).map(([k, c]) => <button key={k} type="button" aria-label={k} onClick={() => onChange({ ...value, color: k })} className={`flex h-8 w-8 items-center justify-center rounded-full ${c.dot} ${value?.color === k ? 'ring-2 ring-primary ring-offset-2' : ''}`}>{value?.color === k && <TbCheck className="text-white" />}</button>)}</div>
        {extra}
        <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>{tr('Cancel')}</Button><Button variant="solid" disabled={!value?.name?.trim()} onClick={onSave}>{tr('Save')}</Button></div>
    </Dialog>
)

/**
 * Lists in coloured accordions, one per group: click to open, drag a line to another group (or a group to reorder the groups).
 *   groups: [{ id, name, color, items: [...], sub?: text under the name (a total...) , locked?: true for the "no group" one }]
 *   renderRow(item, { handle, dragging }) the content of one line (the handle is the grip to place in it)
 *   onMove({ item, from, to, index }) after a drop (the page saves it), onReorderGroups(ids), onAdd(group), onEdit(group), onDelete(group)
 */
const GroupedAccordions = ({ storeKey, groups, renderRow, onMove, onReorderGroups, onAdd, onEdit, onDelete, canDrag = true, canEdit = true, canDelete = true, canAdd = true, forceOpen = false, empty, groupEmpty }) => {
    const [open, setOpen] = useState(() => { try { return JSON.parse(localStorage.getItem(storeKey) || '[]') } catch { return [] } })
    useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(open)) } catch { /* the page works without it */ } }, [open, storeKey])
    const toggle = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
    const isOpen = (id) => forceOpen || open.includes(id)

    const onDragEnd = (r) => {
        const { source, destination, draggableId, type } = r
        if (!destination) return
        if (type === 'GROUP') { if (destination.index !== source.index) { const ids = groups.filter((g) => !g.locked).map((g) => g.id); const [m] = ids.splice(source.index, 1); ids.splice(destination.index, 0, m); onReorderGroups?.(ids) } return }
        if (source.droppableId === destination.droppableId && source.index === destination.index) return
        const item = groups.find((g) => g.id === source.droppableId)?.items.find((i) => i.id === draggableId)
        if (item) { if (destination.droppableId !== source.droppableId && !open.includes(destination.droppableId)) setOpen((o) => [...o, destination.droppableId]); onMove?.({ item, from: source.droppableId, to: destination.droppableId, index: destination.index }) }
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="groups" type="GROUP" isDropDisabled={!canDrag || forceOpen}>
                {(gp) => (
                    <div ref={gp.innerRef} {...gp.droppableProps} className="space-y-3">
                        {groups.map((g, gi) => {
                            const c = COLORS[colorOf(g.color)]
                            const opened = isOpen(g.id)
                            return (
                                <Draggable key={g.id} draggableId={`g-${g.id}`} index={gi} isDragDisabled={!canDrag || forceOpen || g.locked || !onReorderGroups}>
                                    {(p, snap) => (
                                        <div ref={p.innerRef} {...p.draggableProps} className={`overflow-hidden rounded-2xl border ${c.ring} bg-white dark:bg-gray-800 ${snap.isDragging ? 'shadow-xl' : ''}`}>
                                            <div className={`flex items-center gap-2 px-3 py-2.5 ${c.tint}`}>
                                                <span {...p.dragHandleProps} className={`text-lg ${g.locked || !canDrag || forceOpen || !onReorderGroups ? 'invisible' : 'cursor-grab text-gray-400'}`}><TbGripVertical /></span>
                                                <button type="button" onClick={() => toggle(g.id)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                                                    <span className={`h-3 w-3 shrink-0 rounded-full ${c.dot}`} />
                                                    <span className={`truncate font-bold ${c.text}`}>{g.name}</span>
                                                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">{g.items.length}</span>
                                                    {g.sub && <span className="hidden truncate text-xs font-semibold text-gray-500 sm:inline">{g.sub}</span>}
                                                    <TbChevronDown className={`ms-auto shrink-0 text-lg text-gray-500 transition ${opened ? 'rotate-180' : ''}`} />
                                                </button>
                                                {!g.locked && canAdd && onAdd && <Button size="xs" variant="plain" icon={<TbPlus />} aria-label={tr('New')} onClick={() => onAdd(g)} />}
                                                {!g.locked && canEdit && onEdit && <Button size="xs" variant="plain" icon={<TbPencil />} aria-label={tr('Rename or recolour')} onClick={() => onEdit(g)} />}
                                                {!g.locked && canDelete && onDelete && <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} aria-label={tr('Delete the group')} onClick={() => onDelete(g)} />}
                                            </div>
                                            <Droppable droppableId={g.id} type="ITEM" isDropDisabled={!canDrag}>
                                                {(ip, is) => (
                                                    <div ref={ip.innerRef} {...ip.droppableProps} className={`space-y-1.5 px-3 ${opened ? 'py-3' : 'h-0 overflow-hidden py-0'} ${is.isDraggingOver ? c.tint : ''}`}>
                                                        {opened && g.items.map((item, idx) => (
                                                            <Draggable key={item.id} draggableId={item.id} index={idx} isDragDisabled={!canDrag}>
                                                                {(dp, ds) => (
                                                                    <div ref={dp.innerRef} {...dp.draggableProps} className={`rounded-lg border bg-white px-2 py-1.5 text-sm dark:bg-gray-800 ${ds.isDragging ? 'border-primary shadow-lg' : 'border-gray-100 dark:border-gray-700'}`}>
                                                                        {renderRow(item, { dragging: ds.isDragging, handle: <span {...dp.dragHandleProps} className={`flex h-7 w-6 shrink-0 items-center justify-center text-lg ${canDrag ? 'cursor-grab text-gray-400 hover:text-gray-600' : 'text-gray-200'}`} title={canDrag ? tr('Drag to reorder or to move to another group') : ''}><TbGripVertical /></span> })}
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {ip.placeholder}
                                                        {opened && !g.items.length && <p className="py-3 text-center text-sm text-gray-400">{groupEmpty || tr('Nothing in this group.')}</p>}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    )}
                                </Draggable>
                            )
                        })}
                        {gp.placeholder}
                        {!groups.length && <p className="py-10 text-center text-gray-400">{empty || tr('Nothing here yet.')}</p>}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}

export default GroupedAccordions
