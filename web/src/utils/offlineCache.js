// A small browser-side cache (memory + IndexedDB) for the read-mostly lists the CRM asks for on every page: statuses, currencies,
// taxes, categories, company settings. Fresh answers are used without waiting for the network, older ones are shown at once and
// refreshed in the background, and when the connection is slow or gone the last copy is used instead of an error.
// Entries are kept per signed-in person, are dropped when anything is saved through the API, and are wiped at sign-out.
import { useSessionUser } from '@/store/authStore'

const DB = 'trtcrm-cache'
const STORE = 'get'
const FRESH_MS = 60 * 1000        // answer from the cache only
const STALE_MS = 10 * 60 * 1000   // answer from the cache and refresh behind the scenes
const SLOW_MS = 4000              // network that answers slower than this falls back to the last copy

/** Only the lookup-style endpoints: small, change rarely, same for every page that uses them. */
const CACHEABLE = [
    /^\/api\/crm\/[a-z-]+(\/[a-z-]+)*\/lookups(\?|$)/,
    /^\/api\/crm\/taxes(\?|$)/,
    /^\/api\/crm\/custom-fields(\?|$)/,
    /^\/api\/crm\/company(\?|$)/,
    /^\/api\/crm\/settings\/app(\?|$)/,
    /^\/api\/crm\/sales\/expenses\/categories(\?|$)/,
    /^\/api\/crm\/kb\/groups(\?|$)/,
]

const mem = new Map()
let dbp = null

const who = () => { try { return useSessionUser.getState().user?.email || '' } catch { return '' } }
const keyOf = (url) => `${who()}|${url}`

function open() {
    if (!dbp) dbp = new Promise((resolve) => {
        try {
            const r = indexedDB.open(DB, 1)
            r.onupgradeneeded = () => r.result.createObjectStore(STORE)
            r.onsuccess = () => resolve(r.result)
            r.onerror = () => resolve(null)
        } catch { resolve(null) }
    })
    return dbp
}

async function idb(mode, fn) {
    const db = await open()
    if (!db) return undefined
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, mode)
            const req = fn(tx.objectStore(STORE))
            tx.oncomplete = () => resolve(req?.result)
            tx.onerror = tx.onabort = () => resolve(undefined)
        } catch { resolve(undefined) }
    })
}

export const isCacheable = (url) => CACHEABLE.some((re) => re.test(url))

async function read(url) {
    const k = keyOf(url)
    if (mem.has(k)) return mem.get(k)
    const e = await idb('readonly', (s) => s.get(k))
    if (e) mem.set(k, e)
    return e
}

function write(url, data) {
    const k = keyOf(url)
    const e = { data, t: Date.now() }
    mem.set(k, e)
    idb('readwrite', (s) => s.put(e, k))
}

/** Anything was saved: the cached lists may be out of date. */
export function dropCache() {
    mem.clear()
    idb('readwrite', (s) => s.clear())
}

/** Sign-out: remove every copy, including the database. */
export function wipeCache() {
    mem.clear()
    try { indexedDB.deleteDatabase(DB) } catch { /* no IndexedDB */ }
    dbp = null
}

/** `load()` is the real network call. Returns the data, from the cache when that is good enough. */
export async function cachedGet(url, load) {
    const e = await read(url)
    const age = e ? Date.now() - e.t : Infinity
    const refresh = () => load().then((d) => { write(url, d); return d })
    if (age < FRESH_MS) return e.data
    if (age < STALE_MS) { refresh().catch(() => {}); return e.data }
    if (!e) return refresh()
    // an old copy exists: wait a short while for the network, then fall back to it
    const slow = new Promise((resolve) => setTimeout(() => resolve(e.data), SLOW_MS))
    return Promise.race([refresh().catch(() => e.data), slow])
}
