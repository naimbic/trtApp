/* trtCRM service worker: keeps the app itself (page shell, scripts, styles, fonts, images) in the browser so it opens fast on a slow
   connection. It never touches the API, short links or uploads: personal data is not stored here. */
const VERSION = 'v1'
const ASSETS = `trtcrm-assets-${VERSION}`   // /assets/* files have a hash in their name, so a copy never goes out of date
const SHELL = `trtcrm-shell-${VERSION}`

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        for (const k of await caches.keys()) if (![ASSETS, SHELL].includes(k)) await caches.delete(k)
        await self.clients.claim()
    })())
})

self.addEventListener('fetch', (e) => {
    const req = e.request
    if (req.method !== 'GET') return
    const url = new URL(req.url)
    if (url.origin !== location.origin) return
    const p = url.pathname
    if (p.startsWith('/api/') || /^\/s\//.test(p) || p === '/sw.js') return

    // hashed build files: cache first
    if (p.startsWith('/assets/')) {
        e.respondWith((async () => {
            const cache = await caches.open(ASSETS)
            const hit = await cache.match(req)
            if (hit) return hit
            const res = await fetch(req)
            if (res.ok) cache.put(req, res.clone())
            return res
        })())
        return
    }

    // page navigations: the network first (so a new release shows at once), the saved shell when it is slow or offline
    if (req.mode === 'navigate') {
        e.respondWith((async () => {
            const cache = await caches.open(SHELL)
            try {
                const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 5000))])
                if (res.ok && res.headers.get('content-type')?.includes('text/html')) cache.put('/index.html', res.clone())
                return res
            } catch {
                return (await cache.match('/index.html')) || Response.error()
            }
        })())
    }
})
