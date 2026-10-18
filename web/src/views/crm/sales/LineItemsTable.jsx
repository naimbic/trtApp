import { useRef } from 'react'
import { DragDropContext, Draggable } from '@hello-pangea/dnd'
import { TbGripVertical, TbPlus, TbTrash } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StrictModeDroppable from '@/components/shared/StrictModeDroppable'
import { tr } from '@/utils/t'
import { plainText } from '@/lib/crm/richText'

const money2 = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const COLS = 'grid grid-cols-[24px_minmax(0,1fr)_72px_104px_minmax(0,200px)_104px_32px] items-start gap-x-2'
let uid = 0

/**
 * The lines of a sales document (invoice, estimate, proposal, purchase order) with drag-to-reorder.
 * Array order is what the server saves, so reordering is just moving an item in `items`.
 */
const LineItemsTable = ({ items, onChange, taxOptions, newLine }) => {
    // stable keys so a dragged row keeps its inputs; client-only, the server ignores `_key`
    const keys = useRef(new WeakMap())
    const keyOf = (it) => {
        if (!keys.current.has(it)) keys.current.set(it, `l${++uid}`)
        return keys.current.get(it)
    }
    const setLine = (i, patch) => onChange(items.map((r, idx) => {
        if (idx !== i) return r
        const next = { ...r, ...patch }
        keys.current.set(next, keyOf(r))
        return next
    }))
    const onDragEnd = (r) => {
        if (!r.destination || r.destination.index === r.source.index) return
        const next = [...items]
        const [moved] = next.splice(r.source.index, 1)
        next.splice(r.destination.index, 0, moved)
        onChange(next)
    }
    const remove = (i) => onChange(items.length > 1 ? items.filter((_, x) => x !== i) : [newLine()])

    return (
        <div>
            <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                    <div className={`${COLS} pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500`}>
                        <span /><span>{tr("Description")}</span><span>{tr("Qty")}</span><span>{tr("Rate")}</span><span>{tr("Tax")}</span><span className="text-right">{tr("Amount")}</span><span />
                    </div>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <StrictModeDroppable droppableId="lines">
                            {(drop) => (
                                <div ref={drop.innerRef} {...drop.droppableProps}>
                                    {items.map((it, i) => (
                                        <Draggable key={keyOf(it)} draggableId={keyOf(it)} index={i}>
                                            {(drag, snap) => (
                                                <div ref={drag.innerRef} {...drag.draggableProps} className={`${COLS} mb-2 rounded-xl border bg-white p-2 dark:bg-gray-800 ${snap.isDragging ? 'border-primary shadow-lg' : 'border-gray-200 dark:border-gray-600'}`} style={drag.draggableProps.style}>
                                                    <span {...drag.dragHandleProps} title={tr("Drag to reorder")} className="flex h-9 cursor-grab items-center justify-center text-xl text-gray-400 hover:text-primary"><TbGripVertical /></span>
                                                    <div className="min-w-0"><Input value={plainText(it.description)} placeholder={tr("Description")} onChange={(e) => setLine(i, { description: e.target.value })} /><Input className="mt-1" textArea rows={2} value={plainText(it.longDescription)} placeholder={tr("Long description (optional)")} onChange={(e) => setLine(i, { longDescription: e.target.value })} /></div>
                                                    <Input type="number" step="any" value={it.qty} onChange={(e) => setLine(i, { qty: e.target.value === '' ? '' : Number(e.target.value) })} />
                                                    <Input type="number" step="0.01" value={it.rate} onChange={(e) => setLine(i, { rate: e.target.value === '' ? '' : Number(e.target.value) })} />
                                                    <Select isMulti menuPortalTarget={document.body} menuPosition="fixed" options={taxOptions} value={taxOptions.filter((o) => it.taxes.some((t) => `${t.name}|${t.rate}` === o.value))} onChange={(opts) => setLine(i, { taxes: (opts || []).map((o) => o.tax) })} />
                                                    <span className="pt-2 text-right text-sm font-semibold tabular-nums">{money2((Number(it.qty) || 0) * (Number(it.rate) || 0))}</span>
                                                    <Button size="sm" variant="plain" icon={<TbTrash />} onClick={() => remove(i)} />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {drop.placeholder}
                                </div>
                            )}
                        </StrictModeDroppable>
                    </DragDropContext>
                </div>
            </div>
            <Button size="sm" icon={<TbPlus />} onClick={() => onChange([...items, newLine()])}>{tr("Add line")}</Button>
        </div>
    )
}

export default LineItemsTable
