import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { loadStaffLang, tr } from '@/utils/t'
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
    if (res.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth') && !url.startsWith('/api/portal') && !url.startsWith('/api/crm/auth/') && !url.startsWith('/api/crm/mentions') && !onPublicPage() && !redirecting) {
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

// pages a signed-out person is meant to see (the client area and the staff sign-in): a 401 from a staff call there is normal, never a reason to send them to the staff sign-in
function onPublicPage() { return /^\/(portal(\/|$)|sign-in|forgot-password|reset-password|sign-up)/.test(window.location.pathname) }

// Ctrl/Cmd + click or a middle click on a record (a card, a row, a button that opens a page) opens that page in a new browser tab
// (such elements carry data-href next to their normal click). Ordinary clicks are untouched.
function openInNewTab(e) {
    // a link written in an editor (comment, description, note) is edited, not followed: Ctrl/Cmd + click opens it
    const link = e.target.closest?.('a[href]')
    if (link && link.closest('[contenteditable=true]')) { e.preventDefault(); window.open(link.href, '_blank', 'noopener'); return }
    const el = e.target.closest?.('[data-href]')
    if (!el || e.target.closest?.('a[href]') || /^\/portal(\/|$)/.test(window.location.pathname)) return
    e.preventDefault(); e.stopPropagation()
    window.open(el.getAttribute('data-href'), '_blank', 'noopener')
}
document.addEventListener('click', (e) => { if (e.ctrlKey || e.metaKey) openInNewTab(e) }, true)
document.addEventListener('auxclick', (e) => { if (e.button === 1) openInNewTab(e) }, true)
// Right-click on a record (card, row, button that opens a page) offers Open in new tab and Copy link, like a real link would
let ctxMenu = null
const closeCtx = () => { ctxMenu?.remove(); ctxMenu = null }
document.addEventListener('contextmenu', (e) => {
    closeCtx()
    const el = e.target.closest?.('[data-href]')
    if (!el || e.target.closest?.('a[href], input, textarea, [contenteditable=true]') || /^\/portal(\/|$)/.test(window.location.pathname)) return
    e.preventDefault()
    const url = new URL(el.getAttribute('data-href'), window.location.origin).href
    const menu = document.createElement('div')
    menu.className = 'rp-portal rp-tmenu'
    menu.setAttribute('role', 'menu')
    menu.style.cssText = `position:fixed;z-index:100001;top:${Math.min(e.clientY, window.innerHeight - 100)}px;left:${Math.min(e.clientX, window.innerWidth - 200)}px`
    const row = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.className = 'rp-tm-row'; b.innerHTML = '<span></span>'; b.firstChild.textContent = label; b.onclick = () => { closeCtx(); fn() }; menu.appendChild(b) }
    row(tr('Open in new tab'), () => window.open(url, '_blank', 'noopener'))
    row(tr('Copy link'), () => { navigator.clipboard?.writeText(url).catch(() => {}) })
    document.body.appendChild(menu)
    ctxMenu = menu
}, true)
document.addEventListener('mousedown', (e) => { if (ctxMenu && !ctxMenu.contains(e.target)) closeCtx() }, true)
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCtx() }, true)
window.addEventListener('scroll', closeCtx, true)
window.addEventListener('blur', closeCtx)
document.addEventListener('mousedown', (e) => { if (e.button === 1 && e.target.closest?.('[data-href]')) e.preventDefault() }, true) // no auto-scroll cursor on a middle click

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
