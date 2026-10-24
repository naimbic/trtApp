// @mentions and #tags: the people and tags to suggest, and finding who was mentioned in a text that is being saved.
let dir = null
let loading = null

/** { staff: [{id, name}], tags: [name] }, read once and kept for the session. */
export function mentionDirectory() {
    if (dir) return Promise.resolve(dir)
    loading ??= fetch('/api/crm/mentions', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { staff: [], tags: [] }))
        .then((d) => { dir = d; return d })
        .catch(() => ({ staff: [], tags: [] }))
        .finally(() => { loading = null })
    return loading
}
export const forgetMentions = () => { dir = null }

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Ids of the colleagues named as "@Full Name" in the text (the name must be followed by a space, punctuation or the end). */
export function mentionedIds(text, staff) {
    const t = norm(text)
    if (!t.includes('@')) return []
    const out = []
    for (const s of staff || []) {
        const n = norm(s.name)
        if (!n) continue
        const re = new RegExp(`(^|[\\s(])@${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s.,;:!?)])`)
        if (re.test(t)) out.push(s.id)
    }
    return out
}

/** Every text value inside a JSON body. */
export function textsOf(v, out = []) {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach((x) => textsOf(x, out))
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => textsOf(x, out))
    return out
}
