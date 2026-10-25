import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { loadStaffLang } from '@/utils/t'
import { useThemeStore } from '@/store/themeStore'
import { dropCache } from '@/utils/offlineCache'
import { mentionDirectory, mentionedIds, textsOf } from '@/utils/mentions'
import { clearUserData } from '@/utils/clearUserData'
import { localizeShared } from '@/utils/localizeShared'

// If the server says the session is gone (401) — signed out elsewhere, deactivated, or the database changed —
// clear the local state and go to the sign-in page instead of showing a raw error.
const nativeFetch = window.fetch.bind(window)
let redirecting = false
window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
    // data of the API belongs to whoever is signed in: never answer it from the browser cache
    if (url.startsWith('/api/')) args[1] = { cache: 'no-store', ...args[1] }
    const res = await nativeFetch(...args)
    // anything saved through the API may change the cached lookup lists
    if (url.startsWith('/api/crm/') && !['GET', 'HEAD', undefined].includes(args[1]?.method?.toUpperCase?.())) dropCache()
    // a new comment, note, reply or message that names a colleague with @: tell them (once the save worked)
    if (res.ok && url.startsWith('/api/crm/') && !url.startsWith('/api/crm/mentions') && !url.startsWith('/api/crm/auth/') && !/\/(comments|notes)(\?|$)/.test(url) && args[1]?.method?.toUpperCase?.() === 'POST' && typeof args[1].body === 'string' && args[1].body.includes('@')) {
        try {
            const texts = textsOf(JSON.parse(args[1].body)).map((t) => t.replace(/<[^>]+>/g, ' ')).map((t) => t.replace(/<[^>]+>/g, ' '))
            if (texts.some((t) => t.includes('@'))) {
                mentionDirectory().then((d) => {
                    const ids = [...new Set(texts.flatMap((t) => mentionedIds(t, d.staff)))]
                    if (ids.length) nativeFetch('/api/crm/mentions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffIds: ids, text: texts.find((t) => t.includes('@')), url: window.location.pathname + window.location.search }) }).catch(() => {})
                })
            }
        } catch { /* not JSON: a file upload or a form */ }
    }
    if (res.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth') && !url.startsWith('/api/portal') && !url.startsWith('/api/crm/auth/') && !url.startsWith('/api/crm/mentions') && !redirecting) {
        redirecting = true
        try {
            clearUserData()
        } catch {
            /* storage unavailable */
        }
        const back = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.assign(`/sign-in?redirectUrl=${back}`)
    }
    return res
}

// The dictionary of the saved language (and right-to-left for Arabic) must be ready before the app's modules run:
// many labels are defined at module level, so the app is imported only after the dictionary has loaded.
loadStaffLang().then(async (lang) => {
    useThemeStore.getState().setDirection(lang === 'ar' ? 'rtl' : 'ltr')
    if (lang !== 'en') localizeShared()
    const { default: App } = await import('./App')
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
})

// The app files (not the data) are kept in the browser by a service worker, so the CRM opens fast on a slow connection.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
