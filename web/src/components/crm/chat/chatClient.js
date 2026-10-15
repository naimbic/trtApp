// Staff chat API calls, shared by the bubble and the full chat page.
export const chatApi = async (url, init) => {
    const r = await fetch(`/api/crm/chat${url}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || 'Request failed')
    return j
}
export const chatPost = (url, body) => chatApi(url, { method: 'POST', body: JSON.stringify(body) })
export const chatPatch = (url, body) => chatApi(url, { method: 'PATCH', body: JSON.stringify(body) })
export const chatDelete = (url) => chatApi(url, { method: 'DELETE' })
