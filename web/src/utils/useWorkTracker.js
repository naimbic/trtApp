// Work hours: while a team member really uses the CRM (tab visible, a click, key or scroll in the last two minutes) the app
// sends a heartbeat every minute with how many seconds of that minute the mouse or keyboard really moved. It measures nothing
// outside the CRM tab and never what is typed or where the pointer is: only "was there movement in this second".
import { useEffect } from 'react'

const EVERY = 60000
const ACTIVE_WITHIN = 120000

export default function useWorkTracker(enabled = true) {
    useEffect(() => {
        if (!enabled) return undefined
        let last = Date.now()
        let seconds = new Set() // the seconds of this minute in which something moved
        const touch = () => { const now = Date.now(); last = now; seconds.add(Math.floor(now / 1000)) }
        const ping = () => {
            const input = Math.min(60, seconds.size)
            seconds = new Set()
            if (document.visibilityState !== 'visible' || Date.now() - last > ACTIVE_WITHIN) return
            fetch('/api/crm/work-hours/ping', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input }) }).catch(() => {})
        }
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']
        events.forEach((e) => window.addEventListener(e, touch, { passive: true }))
        const first = setTimeout(ping, 3000)
        const timer = setInterval(ping, EVERY)
        return () => { clearTimeout(first); clearInterval(timer); events.forEach((e) => window.removeEventListener(e, touch)) }
    }, [enabled])
}
