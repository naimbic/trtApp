/* trtCRM service worker: keeps the app itself (page shell, scripts, styles, fonts, images) in the browser so it opens fast on a slow
   connection. It never touches the API, short links or uploads: personal data is not stored here. */
const VERSION = 'v3'
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


/* ---------------------------------------------------------------- push notifications (a message on the screen of the phone, even when the app is closed) */
self.addEventListener('push', (e) => {
    let d = {}
    try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data ? e.data.text() : '' } }
    e.waitUntil((async () => {
        // the person is looking at the app right now: the bell and the sound already tell them. Not on an iPhone / iPad (Apple takes the
        // permission back from a site that receives a message and shows nothing) and not for a test the person asked for.
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        const apple = /iPhone|iPad|iPod/.test(self.navigator?.userAgent || '')
        if (!d.force && !apple && wins.some((w) => w.visibilityState === 'visible' && w.focused)) return
        await self.registration.showNotification(d.title || 'trtCRM', { body: d.body || '', icon: d.icon, badge: d.badge, tag: d.tag, renotify: !!d.tag, data: { url: d.url || '/' } })
    })())
})

self.addEventListener('notificationclick', (e) => {
    e.notification.close()
    const url = new URL(e.notification.data?.url || '/', self.location.origin).href
    e.waitUntil((async () => {
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const w of wins) {
            if (new URL(w.url).origin !== self.location.origin) continue
            try { await w.focus() } catch { /* some phones refuse: the message below still goes */ }
            w.postMessage({ type: 'open-url', url })   // the open app moves to the page itself (a phone app cannot be navigated from here)
            return
        }
        await self.clients.openWindow(url)
    })())
})

// the browser renewed the subscription: tell the page, which saves the new one
self.addEventListener('pushsubscriptionchange', (e) => {
    e.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then((all) => all.forEach((c) => c.postMessage({ type: 'push-resubscribe' }))))
})
