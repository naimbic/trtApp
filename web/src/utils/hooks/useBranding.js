import { useEffect, useState } from 'react'

let cache = null
let pending = null
const EVENT = 'branding-changed'

const apply = (b) => {
    if (!b) return
    if (b.favicon) {
        let link = document.querySelector('link[rel="icon"]')
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
        link.type = ''
        link.href = b.favicon
    }
    if (b.name) document.title = b.name
}

const load = () => {
    pending ??= fetch('/api/crm/branding').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((b) => { cache = b; apply(b); pending = null; return b })
    return pending
}

/** Platform name, logos and favicon from Settings → General (public, so the sign-in page can use it too). */
export default function useBranding() {
    const [b, setB] = useState(cache)
    useEffect(() => {
        let alive = true
        if (!cache) load().then((x) => alive && setB(x))
        const on = () => { cache = null; load().then((x) => alive && setB(x)) }
        window.addEventListener(EVENT, on)
        return () => { alive = false; window.removeEventListener(EVENT, on) }
    }, [])
    return b
}

/** Tell every logo on screen to reload (after the settings changed). */
export const refreshBranding = () => window.dispatchEvent(new Event(EVENT))
