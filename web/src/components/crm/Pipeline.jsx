/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { createPortal } from 'react-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { TbCalendar, TbInbox } from 'react-icons/tb'
import cn from '@/utils/classNames'
import { tr } from '@/utils/t'

/** Stage tones of the Rapport palette (they follow the colour picked in the dock); a column may also bring its own hex. */
const TONES = {
    butter: ['var(--rp-butter)', 'var(--rp-on-butter)'],
    pine: ['var(--rp-pine)', 'var(--rp-on-pine)'],
    tomato: ['var(--rp-tomato)', 'var(--rp-on-tomato)'],
    ink: ['var(--rp-solid)', '#fbf8f2'],
    good: ['#3f8f6b', '#fbf8f2'],
}
export const TONE_CYCLE = ['butter', 'pine', 'tomato', 'ink', 'good']
const onHex = (hex) => {
    const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16)
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
    return l > 0.62 ? '#17191a' : '#fbf8f2'
}
const colourOf = (col) => (TONES[col.tone] ? TONES[col.tone] : col.color && /^#/.test(col.color) ? [col.color, onHex(col.color)] : TONES.ink)

/** One tile: the date on top, the title, the line under it, and a foot (a label on the left, people on the right). */
const Tile = ({ item, onOpen, dragging, index }) => (
    <div className={cn('rp-face', dragging && 'is-drag')} style={{ '--i': Math.min(index, 10) }} onClick={() => onOpen?.(item)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(item) }}>
        <div className="rp-face-top">
            {item.date ? <span className={cn('rp-face-date', item.overdue && 'is-over')}><TbCalendar />{item.date}</span> : <span />}
            {item.badge && <span className="rp-face-badge">{item.badge}</span>}
        </div>
        <div className="rp-face-title">{item.title}</div>
        {item.sub && <div className="rp-face-sub">{item.sub}</div>}
        <div className="rp-face-foot">
            <span className="rp-face-label">{item.label}</span>
            {item.people}
        </div>
    </div>
)

/**
 * The shared pipeline board: leads, team tasks and project tasks all use it, so they look and move the same.
 *   columns  [{ id, name, color | tone, count, items:[{ id, title, sub, date, overdue, label, badge, people }], total, more:{ left, onClick } }]
 *   onMove   ({ item, from, to, index, fromIndex })  called after the tile dropped; the page saves it (and reloads when it fails)
 *   onOpen   (item)
 *   canDrag  (item, column) => bool
 */
const Pipeline = ({ columns, onMove, onOpen, canDrag = () => true, loading = false, emptyText }) => {
    const onDragEnd = ({ source, destination, draggableId }) => {
        if (!destination) return
        if (source.droppableId === destination.droppableId && source.index === destination.index) return
        const col = columns.find((c) => String(c.id) === source.droppableId)
        const item = col?.items.find((i) => String(i.id) === draggableId)
        if (item) onMove?.({ item, from: source.droppableId, to: destination.droppableId, index: destination.index, fromIndex: source.index })
    }
    const tones = Object.fromEntries(columns.map((c) => [String(c.id), colourOf(c)]))
    return (
        <div className="rp-pl">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="rp-pl-cols">
                    {columns.map((c, ci) => {
                        const [t, on] = colourOf(c)
                        return (
                            <section key={c.id} className="rp-pl-col" style={{ '--t': t, '--on': on, '--ci': ci }}>
                                <header className="rp-pl-head">
                                    <span className="rp-pl-dot" />
                                    <span className="rp-pl-name" title={c.name}>{c.name}</span>
                                    <span className="rp-pl-count">{c.count ?? c.items.length}</span>
                                    {c.total && <span className="rp-pl-total">{c.total}</span>}
                                </header>
                                <Droppable droppableId={String(c.id)}>
                                    {(prov, snap) => (
                                        <div ref={prov.innerRef} {...prov.droppableProps} className={cn('rp-pl-body', snap.isDraggingOver && 'is-over')}>
                                            {c.items.map((it, i) => (
                                                <Draggable key={it.id} draggableId={String(it.id)} index={i} isDragDisabled={!canDrag(it, c)}>
                                                    {(p, s) => {
                                                        // while it is dragged the tile takes the colour of the column it is over
                                                        const [tt, oo] = s.draggingOver && tones[s.draggingOver] ? tones[s.draggingOver] : [t, on]
                                                        const node = <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={cn('rp-pl-card', s.isDragging && 'rp-portal')} style={{ ...p.draggableProps.style, '--t': tt, '--on': oo }}><Tile item={it} onOpen={onOpen} dragging={s.isDragging} index={i} /></div>
                                                        // lifted into the page body so no column (mask, scroll, animation) can offset or clip it
                                                        return s.isDragging ? createPortal(node, document.body) : node
                                                    }}
                                                </Draggable>
                                            ))}
                                            {prov.placeholder}
                                            {!loading && !c.items.length && !snap.isDraggingOver && <div className="rp-pl-empty"><TbInbox />{emptyText || tr('Nothing here')}</div>}
                                            {c.more && <button type="button" className="rp-pl-more" onClick={c.more.onClick}>{tr('Show {n} more', { n: c.more.left })}</button>}
                                        </div>
                                    )}
                                </Droppable>
                            </section>
                        )
                    })}
                </div>
            </DragDropContext>
        </div>
    )
}

export default Pipeline
