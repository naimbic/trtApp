/**
 * A small in-memory cache for figures that are slow to compute and change little (the dashboards).
 *  - fresh:  the answer is reused as it is for this long;
 *  - stale:  after that, and for this long, the OLD answer is returned at once and a new one is computed in the background,
 *            so nobody waits for it (the next visit shows the new figures);
 *  - force:  compute now (the "refresh" of a person).
 * Two people asking at the same time share one computation. Lives in the server process (a restart empties it, nothing is lost).
 */
const store = new Map()
const MAX = 300

export async function swr(key, load, { fresh = 300000, stale = 6 * 3600000, force = false } = {}) {
    const now = Date.now()
    const e = store.get(key)
    const run = () => {
        if (e?.loading) return e.loading
        const p = Promise.resolve().then(load).then((value) => {
            store.set(key, { value, at: Date.now(), loading: null })
            if (store.size > MAX) store.delete(store.keys().next().value)
            return value
        }).catch((err) => { const cur = store.get(key); if (cur) cur.loading = null; throw err })
        store.set(key, { ...(e || { value: undefined, at: 0 }), loading: p })
        return p
    }
    if (!force && e && e.value !== undefined) {
        const age = now - e.at
        if (age < fresh) return e.value
        if (age < stale) { run().catch(() => {}); return e.value }
    }
    return run()
}

export const dropCache = (prefix = '') => { for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k) }
export const cacheSize = () => store.size
