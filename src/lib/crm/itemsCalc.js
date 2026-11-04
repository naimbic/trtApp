/** The pure part of the Items page: colours, the order of what is dragged, and what the AI sent back. */
export const GROUP_COLORS = ['blue', 'sky', 'emerald', 'amber', 'orange', 'red', 'pink', 'violet', 'slate']
export const colorName = (c) => (GROUP_COLORS.includes(c) ? c : 'slate')
/** A colour for a group that has none yet: always the same one for the same name. */
export const autoColor = (name) => GROUP_COLORS[[...String(name || '')].reduce((n, ch) => n + ch.charCodeAt(0), 0) % (GROUP_COLORS.length - 1)]

/** After a drag: the ids of one list, with `id` moved to `index` (and put in when it came from another list). */
export function placed(ids, id, index) {
    const rest = ids.filter((x) => x !== id)
    const at = Math.max(0, Math.min(Number.isFinite(+index) ? +index : rest.length, rest.length))
    rest.splice(at, 0, id)
    return rest
}

const num = (v) => { const n = Number(String(v ?? '').replace(',', '.').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0 }
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

/** The JSON array an AI answered with (maybe inside text or a code block), cleaned: at most `max` items without a name twice. */
export function readSuggestions(text, { max = 12, existing = [] } = {}) {
    const t = String(text || '')
    const a = t.indexOf('['), b = t.lastIndexOf(']')
    if (a < 0 || b <= a) return []
    let arr
    try { arr = JSON.parse(t.slice(a, b + 1)) } catch { return [] }
    if (!Array.isArray(arr)) return []
    const seen = new Set(existing.map((x) => String(x).toLowerCase().trim()))
    const out = []
    for (const x of arr) {
        const description = clip(x?.description ?? x?.name ?? x?.title, 120)
        if (!description || seen.has(description.toLowerCase())) continue
        seen.add(description.toLowerCase())
        out.push({ description, longDescription: String(x?.longDescription ?? x?.details ?? x?.long_description ?? '').trim().slice(0, 1500), unit: clip(x?.unit, 30), rate: num(x?.rate ?? x?.price) })
        if (out.length >= max) break
    }
    return out
}
