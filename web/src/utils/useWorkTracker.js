// Work hours: while a team member really uses the CRM (tab visible, a click, key or scroll in the last
// two minutes) the app sends a heartbeat every minute. It measures nothing outside the CRM.
import { useEffect } from 'react'

const EVERY = 60000
const ACTIVE_WITHIN = 120000

export default function useWorkTracker(enabled = true) {
    useEffect(() => {
        if (!enabled) return undefined
        let last = Date.now()
        const touch = () => { last = Date.now() }
        const ping = () => {
            if (document.visibilityState !== 'visible' || Date.now() - last > ACTIVE_WITHIN) return
            fetch('/api/crm/work-hours/ping', { method: 'POST', credentials: 'same-origin', keepalive: true }).catch(() => {})
        }
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
        events.forEach((e) => window.addEventListener(e, touch, { passive: true }))
        const first = setTimeout(ping, 3000)
        const timer = setInterval(ping, EVERY)
        return () => { clearTimeout(first); clearInterval(timer); events.forEach((e) => window.removeEventListener(e, touch)) }
    }, [enabled])
}
