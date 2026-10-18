/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { TbChevronRight, TbCheck, TbArrowLeft } from 'react-icons/tb'
import cn from '@/utils/classNames'

const SPRING = { type: 'spring', stiffness: 460, damping: 32 }

/**
 * The three-dots menu of a table row: springs out of its button, with submenus that slide in.
 *   items  [{ label, icon, onClick, danger, after, sub:[{ label, checked, color, onClick }] }]   (after: below the line)
 */
const RowMenu = ({ anchor, items, onClose }) => {
    const reduce = useReducedMotion()
    const ref = useRef(null)
    const [sub, setSub] = useState(null)
    const [pos, setPos] = useState({ top: 0, left: 0 })
    useEffect(() => {
        const r = anchor.getBoundingClientRect(), w = 230, rtl = document.documentElement.dir === 'rtl'
        setPos({ top: Math.min(r.bottom + 6, window.innerHeight - 400), left: Math.max(10, Math.min(rtl ? r.left : r.right - w, window.innerWidth - w - 10)) })
        const away = (e) => { if (!ref.current?.contains(e.target)) onClose() }
        const esc = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', esc)
        return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc) }
    }, [anchor, onClose])
    const run = (fn) => { onClose(); fn?.() }
    const row = (a, i) => (
        <button key={i} type="button" role="menuitem" className={cn('rp-tm-row', a.danger && 'is-danger')} onClick={() => (a.sub ? setSub({ title: a.label, list: a.sub }) : run(a.onClick))}>
            {a.icon}<span>{a.label}</span>{a.sub && <TbChevronRight className="rp-tm-go" />}
        </button>
    )
    return createPortal(
        <motion.div ref={ref} className="rp-portal rp-tmenu" role="menu" style={{ top: pos.top, left: pos.left, width: 230 }} initial={reduce ? false : { opacity: 0, y: -8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={SPRING}>
            <AnimatePresence mode="wait" initial={false}>
                {!sub ? (
                    <motion.div key="main" initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.14 }}>
                        {items.filter((a) => !a.after).map(row)}
                        {items.some((a) => a.after) && <hr />}
                        {items.filter((a) => a.after).map(row)}
                    </motion.div>
                ) : (
                    <motion.div key="sub" initial={reduce ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.14 }}>
                        <button type="button" className="rp-tm-back" onClick={() => setSub(null)}><TbArrowLeft className="rp-tm-return" />{sub.title}</button>
                        <div className="rp-tm-scroll">
                            {sub.list.map((o, i) => <button key={i} type="button" role="menuitem" className={cn('rp-tm-row', o.danger && 'is-danger')} onClick={() => run(o.onClick)}>{o.color ? <i className="rp-tm-dot" style={{ background: o.color }} /> : o.icon}<span>{o.label}</span>{o.checked && <TbCheck className="rp-tm-go" />}</button>)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>, document.body)
}

export default RowMenu
