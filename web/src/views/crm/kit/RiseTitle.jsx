import { motion, useReducedMotion } from 'framer-motion'
import classNames from '@/utils/classNames'

// Scripts that join letters (Arabic) or have no spaces (Japanese) must never be split letter by letter: they rise as one piece.
const JOINED = /[؀-ۿ぀-ヿ㐀-鿿]/

/**
 * A page title whose letters rise out of a mask, one after the other (the Rapport entrance). Respects "reduce motion", and keeps the
 * whole text in aria-label so a screen reader hears the words, not the letters.
 */
const RiseTitle = ({ text, as: Tag = 'h1', className, delay = 0 }) => {
    const reduce = useReducedMotion()
    const str = String(text ?? '')
    if (reduce || !str) return <Tag className={classNames('rp-title', className)}>{str}</Tag>
    const MotionTag = motion.create(Tag)
    if (JOINED.test(str)) {
        return (
            <MotionTag className={classNames('rp-title', className)} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay }}>{str}</MotionTag>
        )
    }
    return (
        <MotionTag className={classNames('rp-title', className)} aria-label={str} initial="hide" animate="show" transition={{ staggerChildren: 0.022, delayChildren: delay }}>
            {str.split(' ').map((w, i) => (
                <span key={i} className="word" aria-hidden="true">
                    {[...w].map((c, n) => <motion.span key={n} className="ch" variants={{ hide: { y: '115%', rotate: 6 }, show: { y: '0%', rotate: 0 } }} transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}>{c}</motion.span>)}
                    {i < str.split(' ').length - 1 ? ' ' : ''}
                </span>
            ))}
        </MotionTag>
    )
}

export default RiseTitle
