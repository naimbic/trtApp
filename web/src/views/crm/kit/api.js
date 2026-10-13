import { createElement } from 'react'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useSessionUser } from '@/store/authStore'

/** JSON fetch against the CRM API. Throws Error(message) with the server's message. */
export async function api(url, init = {}) {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init, body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
    return json
}

export const notify = (type, msg) => toast.push(createElement(Notification, { type }, msg), { placement: 'top-center' })

// ---- permissions (same rules as src/lib/crm/permissions.js on the server)
export const isAdmin = (authority = []) => authority.includes('admin') || authority.includes('crm.admin')
export const hasCap = (authority = [], feature, cap) => {
    if (isAdmin(authority)) return true
    if (authority.includes(`crm.${feature}.${cap}`)) return true
    if (cap === 'view_own') return authority.includes(`crm.${feature}.view`)
    return false
}
/** Hook: can(feature, cap) for the signed-in user. */
export const useCan = () => {
    const authority = useSessionUser((s) => s.user.authority) || []
    return (feature, cap) => !feature || hasCap(authority, feature, cap)
}

export const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()
