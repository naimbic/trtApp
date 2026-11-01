/*! © 2026 TRT Digital — trtCRM. */
import { useRef, useState } from 'react'
import { TbGripVertical } from 'react-icons/tb'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

/**
 * Drag to reorder the rows of a list. `onMove(from, to)` gets the two positions.
 *   const rd = useRowDrag(onMove)
 *   <div {...rd.row(i)} className={rd.over === i ? 'bg-primary/5' : ''}> <DragHandle {...rd.handle(i, canEdit)} enabled={canEdit} /> ...
 * The handle is a real element (a bare SVG icon cannot be dragged in the browsers), carries data so Firefox starts the drag,
 * and shows the whole row while it moves.
 */
export function useRowDrag(onMove) {
    const drag = useRef(null)
    const [over, setOver] = useState(null)
    const end = () => { drag.current = null; setOver(null) }
    const handle = (i, enabled = true) => ({
        draggable: !!enabled,
        onDragStart: (e) => {
            drag.current = i
            e.dataTransfer.effectAllowed = 'move'
            try { e.dataTransfer.setData('text/plain', String(i)) } catch { /* Firefox needs data, others do not mind */ }
            const row = e.currentTarget.closest('[data-drag-row]')
            if (row) try { e.dataTransfer.setDragImage(row, 16, 16) } catch { /* the handle itself is shown instead */ }
        },
        onDragEnd: end,
    })
    const row = (i) => ({
        'data-drag-row': '',
        onDragOver: (e) => { if (drag.current !== null) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver((o) => (o === i ? o : i)) } },
        onDrop: (e) => {
            e.preventDefault()
            const from = drag.current
            end()
            if (from !== null && from !== i) onMove(from, i)
        },
    })
    return { over, handle, row }
}

/** The grip a row is dragged by. Hidden (but keeping its place) when the list cannot be reordered. */
export const DragHandle = ({ enabled = true, className, ...rest }) => (
    <span {...(enabled ? rest : {})} title={enabled ? tr('Drag to reorder') : undefined} className={classNames('grid size-6 shrink-0 select-none place-items-center text-lg text-gray-300 hover:text-gray-500', enabled ? 'cursor-grab active:cursor-grabbing' : 'opacity-0', className)}>
        <TbGripVertical />
    </span>
)
