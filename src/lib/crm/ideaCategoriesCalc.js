// The categories that come with client ideas, and how a new one gets its code. No database: tested on its own.
export const IDEA_CATEGORY_DEFAULTS = [
    { code: 'grow', name: 'Grow the business', color: '#10b981' },
    { code: 'save', name: 'Save money', color: '#f59e0b' },
    { code: 'marketing', name: 'Marketing', color: '#8b5cf6' },
    { code: 'sales', name: 'Sales', color: '#6366f1' },
    { code: 'tech', name: 'Tech', color: '#0ea5e9' },
    { code: 'ops', name: 'Operations', color: '#f97316' },
    { code: 'brand', name: 'Brand', color: '#ec4899' },
    { code: 'other', name: 'Other', color: '#6b7280' },
]
/** The category an idea falls back to when its own was removed. */
export const FALLBACK_CATEGORY = 'other'

/** A short unique code from a name: "Customer care!" -> "customer-care", "customer-care-2" when taken. */
export function codeFromName(name, taken = []) {
    const base = String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'category'
    const used = new Set(taken)
    if (!used.has(base)) return base
    for (let n = 2; n < 1000; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`
    return `${base}-${Date.now()}`
}

/** The codes an AI answer may use: the active categories, else the defaults. */
export const activeCodes = (rows) => { const c = (rows || []).filter((r) => r.isActive !== false).map((r) => r.code); return c.length ? c : IDEA_CATEGORY_DEFAULTS.map((d) => d.code) }
