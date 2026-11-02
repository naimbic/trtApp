// What a client request may hold and how it moves. No database, no network: tested on its own.
export const STATUSES = ['new', 'reviewing', 'planned', 'doing', 'testing', 'waiting', 'done', 'declined']
export const STATUS_LABEL = { new: 'New', reviewing: 'Under review', planned: 'Planned', doing: 'In progress', testing: 'Testing', waiting: 'Waiting for the client', done: 'Done', declined: 'Declined' }
export const STATUS_COLOR = { new: '#3b82f6', reviewing: '#8b5cf6', planned: '#0ea5e9', doing: '#f59e0b', testing: '#d946ef', waiting: '#f97316', done: '#16a34a', declined: '#9ca3af' }
export const TYPES = { bug: 'Error or bug', integration: 'Code integration', change: 'Change or improvement', question: 'Question', other: 'Other' }
export const PRIORITIES = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
/** Done and declined requests are closed; everything else is open. */
export const isOpen = (status) => !['done', 'declined'].includes(status)
export const cleanStatus = (s, fallback = 'new') => (STATUSES.includes(s) ? s : fallback)
export const cleanType = (t) => (Object.prototype.hasOwnProperty.call(TYPES, t) ? t : 'other')
export const cleanPriority = (p) => Math.min(4, Math.max(1, parseInt(p, 10) || 2))
/** The page a request is about: only a web address. */
export function cleanUrl(u) {
    let raw = String(u ?? '').trim()
    if (!raw) return null
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`
    try { const x = new URL(raw); return ['http:', 'https:'].includes(x.protocol) && x.hostname.includes('.') ? x.href.slice(0, 500) : null } catch { return null }
}
/** What the client may do from the client area: reopen a closed request. */
export const clientCanReopen = (status) => !isOpen(status)
/** REQ-12 */
export const codeOf = (seq) => `REQ-${seq || 0}`
