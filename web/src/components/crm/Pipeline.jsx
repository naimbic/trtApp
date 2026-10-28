/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { TbCalendar, TbMessageCircle, TbInbox, TbDots, TbChevronRight, TbCheck, TbArrowUpRight, TbPlus, TbArrowLeft } from 'react-icons/tb'
import cn from '@/utils/classNames'
import { tr, trn } from '@/utils/t'

/** Stage tones of the Rapport palette (they follow the colour picked in the dock); a column may also bring its own hex. */
const TONES = {
    butter: ['var(--rp-butter)', 'var(--rp-on-butter)'],
    pine: ['var(--rp-pine)', 'var(--rp-on-pine)'],
    tomato: ['var(--rp-tomato)', 'var(--rp-on-tomato)'],
    ink: ['var(--rp-ink)', 'var(--rp-on-ink)'], // the dark (light mode) / light (dark mode) ink with its own readable text colour
    good: ['#3f8f6b', '#fbf8f2'],
}
export const TONE_CYCLE = ['butter', 'pine', 'tomato', 'ink', 'good']
const onHex = (hex) => {
    const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16)
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
    return l > 0.62 ? '#17191a' : '#fbf8f2'
}
export const colourOf = (col) => (TONES[col.tone] ? TONES[col.tone] : col.color && /^#/.test(col.color) ? [col.color, onHex(col.color)] : TONES.ink)

/** One tile: the date on top, the title, the line under it, and a foot (a label on the left, people on the right). */
const Tile = ({ item, onOpen, onMenu, dragging, index }) => (
    <div className={cn('rp-face', dragging && 'is-drag')} style={{ '--i': Math.min(index, 10) }} onClick={() => onOpen?.(item)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(item) }}>
        <div className="rp-face-top">
            {item.date ? <span className={cn('rp-face-date', item.overdue && 'is-over')}><TbCalendar />{item.date}</span> : <span />}
            <span className="rp-face-tools">
                {item.badge && <span className="rp-face-badge">{item.badge}</span>}
                {onMenu && <button type="button" className="rp-face-more" aria-label={tr('Actions')} aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); onMenu(item, e.currentTarget) }} onPointerDown={(e) => e.stopPropagation()}><TbDots /></button>}
            </span>
        </div>
        <div className="rp-face-title">{item.title}</div>
        {item.sub && (item.subHref
            ? <div className="rp-face-sub"><Link to={item.subHref} className="rp-face-tag" title={item.sub} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>{item.sub}</Link></div>
            : <div className="rp-face-sub">{item.sub}</div>)}
        {item.todo && <div className="rp-face-do" title={item.todo}><i className="rp-face-do-dot" /><span>{item.todo}</span></div>}
        <div className="rp-face-foot">
            <span className={cn('rp-face-label', item.labelColor && 'has-dot', item.labelPill && 'is-pill')} style={item.labelColor ? { '--lc': item.labelColor } : item.labelPill ? { '--pc': item.labelPill } : undefined}>{item.labelColor && <i className="rp-face-dot" />}{item.label}</span>
            <span className="rp-face-end">{item.comments > 0 && <span className="rp-face-cc" title={trn(item.comments, 'comment')}><TbMessageCircle />{item.comments}</span>}{item.people}</span>
        </div>
    </div>
)


const dirRtl = () => document.documentElement.dir === 'rtl'
const SPRING = { type: 'spring', stiffness: 460, damping: 32 }

/** The little menu of a tile: Open, Move to… (a submenu of the stages), then the page's own actions. */
const TileMenu = ({ anchor, columns, item, col, actions, onMoveTo, onClose }) => {
    const reduce = useReducedMotion()
    const ref = useRef(null)
    const [sub, setSub] = useState(null) // { title, list } of the open submenu
    const [pos, setPos] = useState({ top: 0, left: 0 })
    useEffect(() => {
        const r = anchor.getBoundingClientRect(), w = 220, rtl = dirRtl()
        setPos({ top: Math.min(r.bottom + 6, window.innerHeight - 330), left: Math.max(10, Math.min(rtl ? r.left : r.right - w, window.innerWidth - w - 10)) })
        const away = (e) => { if (!ref.current?.contains(e.target)) onClose() }
        const esc = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', esc)
        return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc) }
    }, [anchor, onClose])
    const list = actions || []
    const run = (fn) => { onClose(); fn?.() }
    return createPortal(
        <motion.div ref={ref} className="rp-portal rp-tmenu" role="menu" style={{ top: pos.top, left: pos.left }} initial={reduce ? false : { opacity: 0, y: -8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={SPRING}>
            <AnimatePresence mode="wait" initial={false}>
                {!sub ? (
                    <motion.div key="main" initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.14 }}>
                        {list.filter((a) => !a.after).map((a, i) => <button key={i} type="button" role="menuitem" className={cn('rp-tm-row', a.danger && 'is-danger')} onClick={() => (a.sub ? setSub({ title: a.label, list: a.sub }) : run(a.onClick))}>{a.icon}<span>{a.label}</span>{a.sub && <TbChevronRight className="rp-tm-go" />}</button>)}
                        {onMoveTo && <button type="button" role="menuitem" className="rp-tm-row" onClick={() => setSub({ title: tr('Move to…'), list: columns.map((c) => ({ label: c.name, color: colourOf(c)[0], checked: String(c.id) === String(col.id), onClick: () => onMoveTo(item, c.id) })) })}><TbArrowUpRight /><span>{tr('Move to…')}</span><TbChevronRight className="rp-tm-go" /></button>}
                        {list.some((a) => a.after) && <hr />}
                        {list.filter((a) => a.after).map((a, i) => <button key={i} type="button" role="menuitem" className={cn('rp-tm-row', a.danger && 'is-danger')} onClick={() => run(a.onClick)}>{a.icon}<span>{a.label}</span></button>)}
                    </motion.div>
                ) : (
                    <motion.div key="sub" initial={reduce ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.14 }}>
                        <button type="button" className="rp-tm-back" onClick={() => setSub(null)}><TbArrowLeft className="rp-tm-return" />{sub.title}</button>
                        <div className="rp-tm-scroll">
                            {sub.list.map((o, i) => <button key={i} type="button" role="menuitem" className="rp-tm-row" onClick={() => run(o.onClick)}>{o.color ? <i className="rp-tm-dot" style={{ background: o.color }} /> : o.icon}<span>{o.label}</span>{o.checked && <TbCheck className="rp-tm-go" />}</button>)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>, document.body)
}

/**
 * The shared pipeline board: leads, team tasks and project tasks all use it, so they look and move the same.
 *   columns  [{ id, name, color | tone, count, items:[{ id, title, sub, date, overdue, label, badge, people }], total, more:{ left, onClick } }]
 *   onMove   ({ item, from, to, index, fromIndex })  called after the tile dropped; the page saves it (and reloads when it fails)
 *   onOpen   (item)        a tile was pressed / Open chosen: the page shows its popup (PopupFrame)
 *   onAdd    (column)      the + at the top right of a stage
 *   money    (n) => text   when tiles carry an `amount`, each stage header shows the total of its tiles
 *   onMoveTo (item, columnId)   the Move to… menu and the stage bar of the popup
 *   actions  (item, column) => [{ label, icon, onClick, danger, after }]   extra menu / popup actions (after: below the line)
 *   canDrag  (item, column) => bool
 */
const Pipeline = ({ columns, ends = [], onMove, onOpen, onAdd, onMoveTo, actions, money, canDrag = () => true, loading = false, emptyText }) => {
    const [menu, setMenu] = useState(null)
    const [dragging, setDragging] = useState(false)
    const findCol = (id) => columns.find((c) => c.items.some((i) => String(i.id) === String(id)))
    const menuCol = menu ? findCol(menu.item.id) : null
    const onDragEnd = ({ source, destination, draggableId }) => {
        setDragging(false)
        if (!destination) return
        if (source.droppableId === destination.droppableId && source.index === destination.index) return
        const col = columns.find((c) => String(c.id) === source.droppableId)
        const item = col?.items.find((i) => String(i.id) === draggableId)
        if (item) onMove?.({ item, from: source.droppableId, to: destination.droppableId, index: destination.index, fromIndex: source.index })
    }
    const tones = Object.fromEntries(columns.map((c) => [String(c.id), colourOf(c)]))
    return (
        <div className={cn('rp-pl', ends.length > 0 && 'has-ends', dragging && 'is-dragging')}>
            <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={onDragEnd}>
                <div className="rp-pl-cols">
                    {columns.map((c, ci) => {
                        const [t, on] = colourOf(c)
                        return (
                            <section key={c.id} className="rp-pl-col" style={{ '--t': t, '--on': on, '--ci': ci }}>
                                <header className="rp-pl-head">
                                    <span className="rp-pl-dot" />
                                    <span className="rp-pl-name" title={c.name}>{c.name}</span>
                                    <span className="rp-pl-count">{c.count ?? c.items.length}</span>
                                    {(c.total || (money && c.items.some((i) => typeof i.amount === 'number'))) && <span className="rp-pl-total">{c.total || money(c.items.reduce((n, i) => n + (i.amount || 0), 0))}</span>}
                                    {onAdd && <button type="button" className="rp-pl-add" aria-label={tr('Add to {name}', { name: c.name })} title={tr('Add')} onClick={() => onAdd(c)}><TbPlus /></button>}
                                </header>
                                <Droppable droppableId={String(c.id)}>
                                    {(prov, snap) => (
                                        <div ref={prov.innerRef} {...prov.droppableProps} className={cn('rp-pl-body', snap.isDraggingOver && 'is-over')}>
                                            {c.items.map((it, i) => (
                                                <Draggable key={it.id} draggableId={String(it.id)} index={i} isDragDisabled={!canDrag(it, c)}>
                                                    {(p, s) => {
                                                        // while it is dragged the tile takes the colour of the column it is over
                                                        const [tt, oo] = s.draggingOver && tones[s.draggingOver] ? tones[s.draggingOver] : [t, on]
                                                        const node = <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={cn('rp-pl-card', s.isDragging && 'rp-portal')} style={{ ...p.draggableProps.style, '--t': tt, '--on': oo }}><Tile item={it} onOpen={(x) => onOpen?.(x)} onMenu={(item, el) => setMenu({ item, el })} dragging={s.isDragging} index={i} /></div>
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
                {ends.length > 0 && (
                    <div className="rp-pl-ends" style={{ gridTemplateRows: `repeat(${ends.length}, 1fr)` }}>
                        {ends.map((e) => (
                            <Droppable key={e.id} droppableId={`end:${e.id}`}>
                                {(prov, snap) => (
                                    <div ref={prov.innerRef} {...prov.droppableProps} className={cn('rp-pl-end', e.tone === 'lost' && 'is-lost', e.tone === 'progress' && 'is-progress', snap.isDraggingOver && 'is-over')}>
                                        <span className="rp-pl-end-ico">{e.icon}</span>
                                        <span className="rp-pl-end-txt"><b>{e.name}</b>{e.metric && <span className="rp-pl-end-metric"><strong>{e.metric.value}</strong><em>{e.metric.label}</em></span>}<small>{e.sub}</small></span>
                                        <span className="rp-pl-end-hint">{tr('Drop here')}</span>
                                        <div className="rp-pl-end-ph">{prov.placeholder}</div>
                                    </div>
                                )}
                            </Droppable>
                        ))}
                    </div>
                )}
            </DragDropContext>
            <AnimatePresence>
                {menu && menuCol && <TileMenu key="menu" anchor={menu.el} item={menu.item} col={menuCol} columns={columns} actions={[{ label: tr('Open'), icon: <TbArrowUpRight />, onClick: () => onOpen?.(menu.item) }, ...(actions?.(menu.item, menuCol) || [])]} onMoveTo={onMoveTo} onClose={() => setMenu(null)} />}
            </AnimatePresence>
        </div>
    )
}

export default Pipeline
