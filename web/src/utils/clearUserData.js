// Everything the browser remembers about the person who was signed in: remembered views, filters, favourites,
// drafts, caches. Language and theme are kept (the next sign-in applies the account's own choice anyway).
const KEEP = ['locale', 'theme', 'themeModeChosen']

export function clearUserData() {
    for (const store of [() => localStorage, () => sessionStorage]) {
        try {
            const s = store()
            Object.keys(s).filter((k) => !KEEP.includes(k)).forEach((k) => s.removeItem(k))
        } catch { /* storage unavailable */ }
    }
    try { window.caches?.keys().then((ks) => ks.forEach((k) => window.caches.delete(k))) } catch { /* no cache storage */ }
}
