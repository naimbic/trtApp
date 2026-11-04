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
/** The directory of a page that is not signed in (a public document): the people and tags it was given. */
export const setMentionDirectory = (d) => { dir = { staff: d?.staff || [], tags: d?.tags || [] } }

export { mentionedIds } from '@/lib/crm/mentionsCalc'

/** Every text value inside a JSON body. */
export function textsOf(v, out = []) {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach((x) => textsOf(x, out))
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => textsOf(x, out))
    return out
}
