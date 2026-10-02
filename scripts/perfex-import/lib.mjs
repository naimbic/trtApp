// Helpers shared by every table mapper. Pure functions, no I/O.
import { oid } from '../../src/lib/crm/legacyId.js'

export { oid }

/** MySQL '0000-00-00' / '' / null -> null, otherwise a Date (source times treated as UTC). */
export const toDate = (v) => {
    if (v === null || v === undefined) return null
    const s = String(v).trim()
    if (!s || s.startsWith('0000-00-00')) return null
    const d = new Date(s.length === 10 ? `${s}T00:00:00Z` : `${s.replace(' ', 'T')}Z`)
    return Number.isNaN(d.getTime()) ? null : d
}
export const toInt = (v, dflt = null) => {
    if (v === null || v === undefined || v === '') return dflt
    const n = parseInt(v, 10)
    return Number.isNaN(n) ? dflt : n
}
export const toFloat = (v, dflt = null) => {
    if (v === null || v === undefined || v === '') return dflt
    const n = parseFloat(v)
    return Number.isNaN(n) ? dflt : n
}
/** Perfex stores booleans as tinyint 0/1 (sometimes '1'/'0'). */
export const toBool = (v) => v === 1 || v === '1' || v === true
export const str = (v) => (v === null || v === undefined || v === '' ? null : String(v))
/** Foreign key (legacy int) -> deterministic ObjectId, 0/''/null -> null. */
export const fk = (table, v) => {
    const i = toInt(v)
    return i ? oid(table, i) : null
}
/** Safe JSON / PHP-serialized-agnostic: tries JSON.parse, otherwise returns the raw string. */
export const json = (v) => {
    if (v === null || v === undefined || v === '') return null
    try { return JSON.parse(v) } catch { return String(v) }
}
/** Comma separated list -> array of trimmed non-empty strings. */
export const csv = (v) =>
    v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []
