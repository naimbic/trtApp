import { createElement } from 'react'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useSessionUser } from '@/store/authStore'
import { tr } from '@/utils/t'

/** JSON fetch against the CRM API. Throws Error(message) with the server's message. */
export async function api(url, init = {}) {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init, body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(tr(json.error || tr('Request failed ({status})', { status: res.status })))
    return json
}

export const notify = (type, msg) => toast.push(createElement(Notification, { type }, typeof msg === 'string' ? tr(msg) : msg), { placement: 'top-center' })

// ---- permissions (same rules as src/lib/crm/permissions.js on the server)
export const isAdmin = (authority = []) => authority.includes('admin') || authority.includes('crm.admin')
// same table as IMPLIED_BY in src/lib/crm/permissions.js
const IMPLIED_BY = { settings: { create: 'edit', delete: 'edit' }, email_templates: { create: 'edit', delete: 'edit' }, checklist_templates: { view: 'create', view_own: 'create', edit: 'create' } }
export const hasCap = (authority = [], feature, cap) => {
    if (isAdmin(authority)) return true
    if (authority.includes(`crm.${feature}.${cap}`)) return true
    const by = IMPLIED_BY[feature]?.[cap]
    if (by && authority.includes(`crm.${feature}.${by}`)) return true
    if (cap === 'view_own') return authority.includes(`crm.${feature}.view`)
    return false
}
/** Hook: can(feature, cap) for the signed-in user. */
export const useCan = () => {
    const authority = useSessionUser((s) => s.user.authority) || []
    return (feature, cap) => !feature || hasCap(authority, feature, cap)
}

export const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()

/** Multipart upload (files). Returns the parsed JSON; throws Error(message) like api(). */
export async function upload(url, formData, method = 'POST') {
    const res = await fetch(url, { method, credentials: 'include', body: formData })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(tr(json.error || tr('Upload failed ({status})', { status: res.status })))
    return json
}

export const formatBytes = (n = 0) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`)
