// What a report or a strategy of a client may hold and how it moves. No database, no network: tested on its own.
export const KINDS = { report: 'Report', strategy: 'Strategy' }
export const STATUSES = ['draft', 'sent', 'reviewing', 'changes', 'approved', 'declined']
export const STATUS_LABEL = { draft: 'Draft', sent: 'Sent to the client', reviewing: 'Client is reviewing', changes: 'Changes requested', approved: 'Approved', declined: 'Declined' }
export const STATUS_COLOR = { draft: '#9ca3af', sent: '#3b82f6', reviewing: '#8b5cf6', changes: '#f97316', approved: '#16a34a', declined: '#ef4444' }
export const PRIORITIES = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
export const isOpen = (status) => !['approved', 'declined'].includes(status)
export const cleanStatus = (s, fallback = 'draft') => (STATUSES.includes(s) ? s : fallback)
export const cleanKind = (k) => (Object.prototype.hasOwnProperty.call(KINDS, k) ? k : 'report')
export const cleanPriority = (p) => Math.min(4, Math.max(1, parseInt(p, 10) || 2))
export const codeOf = (seq, kind = 'report') => (seq ? `${kind === 'strategy' ? 'STR' : 'RPT'}-${seq}` : '')
/** Links of a report: only web addresses, with an optional title. */
export function cleanLinks(list) {
    const out = []
    for (const l of Array.isArray(list) ? list : []) {
        let raw = String(l?.url ?? '').trim()
        if (!raw) continue
        if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`
        try {
            const x = new URL(raw)
            if (!['http:', 'https:'].includes(x.protocol) || !x.hostname.includes('.')) continue
            if (out.some((o) => o.url === x.href)) continue
            out.push({ url: x.href.slice(0, 500), title: String(l?.title || '').replace(/\s+/g, ' ').trim().slice(0, 120) })
        } catch { /* not a web address */ }
    }
    return out.slice(0, 20)
}
