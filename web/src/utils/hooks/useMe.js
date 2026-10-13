import { useEffect, useState } from 'react'

let cache = null
let pending = null

/** The signed-in user with a role label (from /api/crm/me), fetched once and shared. */
export default function useMe() {
    const [me, setMe] = useState(cache)
    useEffect(() => {
        if (cache) return
        pending ??= fetch('/api/crm/me', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        pending.then((d) => { cache = d; setMe(d) })
    }, [])
    return me
}

/** Forget the cached user (call after changing the name or picture) so the menus reload it. */
export const resetMe = () => { cache = null; pending = null }
