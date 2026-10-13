import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// If the server says the session is gone (401) — signed out elsewhere, deactivated, or the database changed —
// clear the local state and go to the sign-in page instead of showing a raw error.
const nativeFetch = window.fetch.bind(window)
let redirecting = false
window.fetch = async (...args) => {
    const res = await nativeFetch(...args)
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
    if (res.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth') && !url.startsWith('/api/crm/auth/') && !redirecting) {
        redirecting = true
        try {
            localStorage.removeItem('sessionUser')
        } catch {
            /* storage unavailable */
        }
        const back = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.assign(`/sign-in?redirectUrl=${back}`)
    }
    return res
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
