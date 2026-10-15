// Fetch helper for the client area. A 401 sends the visitor to the portal sign-in, never to the staff one.
export async function portal(url, init = {}) {
    const res = await fetch(`/api/portal${url}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init, body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body })
    const json = await res.json().catch(() => ({}))
    if (res.status === 401 && !init.quiet) {
        const back = encodeURIComponent(window.location.pathname + window.location.search)
        if (!window.location.pathname.startsWith('/portal/sign-in')) window.location.assign(`/portal/sign-in?back=${back}`)
    }
    if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { status: res.status })
    return json
}

/** Multipart POST (a message with files). */
export async function portalUpload(url, formData) {
    const res = await fetch(`/api/portal${url}`, { method: 'POST', credentials: 'include', body: formData })
    const json = await res.json().catch(() => ({}))
    if (res.status === 401) window.location.assign(`/portal/sign-in?back=${encodeURIComponent(window.location.pathname)}`)
    if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { status: res.status })
    return json
}

export const money = (n, cur = null) => {
    const v = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const sym = cur?.symbol || cur?.name || ''
    return cur?.placement === 'after' ? `${v} ${sym}` : `${sym ? sym + ' ' : ''}${v}`
}
