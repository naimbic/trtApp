/*! © 2026 TRT Digital — trtCRM. */
import Tooltip from '@/components/ui/Tooltip'
import { tr } from '@/utils/t'

/** The member's combined score (0-100) as a ring around whatever is inside (their picture). score = null: no ring. */
export const toneOf = (score) => (score === null || score === undefined ? 'none' : score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low')

export const scoreTip = (s) => {
    if (!s || s.score === null) return tr('No score yet: nothing to measure in the last {n} days', { n: s?.days || 30 })
    const p = s.parts || {}
    return [
        tr('Score {n}% · last {d} days', { n: s.score, d: s.days || 30 }),
        p.completion !== null && tr('Tasks completed: {n}%', { n: p.completion }),
        p.onTime !== null && tr('Finished on time: {n}%', { n: p.onTime }),
        p.hours !== null && tr('Time tracked: {n}%', { n: p.hours }),
    ].filter(Boolean).join(' · ')
}

const ScoreRing = ({ score: s, size = 44, width = 3, badge = false, children }) => {
    const score = s?.score ?? null
    const ring = (
        <span className="cx-ring" data-tone={toneOf(score)} style={{ '--p': score ?? 0, '--sz': `${size}px`, '--w': `${width}px` }}>
            <span>{children}</span>
            {badge && score !== null && <small>{score}%</small>}
        </span>
    )
    return <Tooltip title={scoreTip(s)}>{ring}</Tooltip>
}

export default ScoreRing
