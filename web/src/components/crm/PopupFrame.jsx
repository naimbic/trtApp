/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { TbX } from 'react-icons/tb'
import { colourOf } from './Pipeline'
import ShareButton from './ShareButton'
import { tr } from '@/utils/t'

const SPRING = { type: 'spring', stiffness: 460, damping: 32 }

/**
 * The popup of the Rapport look: it slides in with a spring, wears the colour of the stage it belongs to, shows the stage bar
 * (press a step to move) and holds a page's own form. It replaces the plain side drawer for tasks and leads.
 *   stage  { columns:[{ id, name, color | tone }], currentId, onPick(id) }   optional: colours the head and draws the bar
 */
const PopupFrame = ({ isOpen, onClose, width = 560, kicker, title, sub, date, team, stage, footer, share, children }) => {
    const reduce = useReducedMotion()
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
    const cols = stage?.columns || []
    const cur = cols.find((c) => String(c.id) === String(stage?.currentId))
    const [t, on] = colourOf(cur || { tone: 'ink' })
    const idx = cols.findIndex((c) => String(c.id) === String(stage?.currentId))
    useEffect(() => {
        if (!isOpen) return undefined
        const esc = (e) => { if (e.key === 'Escape') onClose?.() }
        document.addEventListener('keydown', esc)
        return () => document.removeEventListener('keydown', esc)
    }, [isOpen, onClose])
    const x = rtl ? -40 : 40
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="rp-portal rp-qv-wrap" key="wrap">
                    <motion.div className="rp-qv-veil" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
                    <motion.aside className="rp-qv" role="dialog" aria-label={title} style={{ '--t': t, '--on': on, width: `min(${width}px, calc(100vw - 24px))` }} initial={reduce ? false : { x, opacity: 0, scale: 0.97 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x, opacity: 0, scale: 0.97 }} transition={SPRING}>
                        {share && <ShareButton url={share.url} title={share.title || title} text={share.text} className="rp-qv-x rp-qv-share" />}
                        <button type="button" className="rp-qv-x" aria-label={tr('Close')} onClick={onClose}><TbX /></button>
                        <p className="rp-qv-kicker">{kicker}</p>
                        <motion.div className="rp-qv-head" initial={reduce ? false : { clipPath: 'inset(0 0 100% 0 round 24px)' }} animate={{ clipPath: 'inset(0 0 0% 0 round 24px)' }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}>
                            <div className="rp-qv-row"><span>{date}</span>{cur && <span className="rp-qv-pill"><i />{cur.name}</span>}</div>
                            <h2>{title}</h2>
                            {sub && <p>{sub}</p>}
                            {team && <div className="rp-qv-foot"><span />{team}</div>}
                        </motion.div>
                        {cols.length > 0 && (
                            <ol className="rp-qv-steps">
                                {cols.map((c, i) => { const [ct] = colourOf(c); return (
                                    <li key={c.id}><button type="button" onClick={() => String(c.id) !== String(stage.currentId) && stage.onPick?.(c.id)} aria-current={i === idx ? 'step' : undefined} disabled={!stage.onPick}>
                                        <span className="rp-qv-bar"><motion.i style={{ background: ct, transformOrigin: rtl ? '100% 50%' : '0 50%' }} initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: i <= idx ? 1 : 0 }} transition={{ delay: 0.15 + i * 0.07, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }} /></span>
                                        <span className="rp-qv-lab">{c.name}</span>
                                    </button></li>
                                ) })}
                            </ol>
                        )}
                        <motion.div className="rp-qv-body" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }}>{children}</motion.div>
                        {footer && <div className="rp-qv-footer">{footer}</div>}
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>, document.body)
}

export default PopupFrame
