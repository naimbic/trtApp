/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import Tooltip from '@/components/ui/Tooltip'
import ScoreRing from './ScoreRing'
import { api } from '@/views/crm/kit/api'

// One request for every ring on the page (and a few minutes of memory), shared by all avatars.
let cache = null
let at = 0
let inflight = null
const load = () => {
    if (cache && Date.now() - at < 300000) return Promise.resolve(cache)
    inflight ||= api('/api/crm/team/scores').then((d) => d.scores || {}).catch(() => ({})).then((m) => { cache = m; at = Date.now(); inflight = null; return m })
    return inflight
}
export const useStaffScores = () => {
    const [map, setMap] = useState(cache || {})
    useEffect(() => { let on = true; load().then((m) => { if (on) setMap(m) }); return () => { on = false } }, [])
    return map
}

/**
 * A team member's picture with their score ring around it (when the viewer may see scores).
 * Put the avatar inside; `size` is the avatar's size. The tooltip shows the name (and the score).
 */
const StaffRing = ({ id, name, size = 28, children }) => {
    const map = useStaffScores()
    const s = id ? map[id] : null
    if (!s) return name ? <Tooltip title={name}><span className="inline-flex">{children}</span></Tooltip> : children
    const w = size >= 40 ? 3 : 2
    return <ScoreRing score={s} size={size + 2 * (w + 1)} width={w} name={name}>{children}</ScoreRing>
}

export default StaffRing
