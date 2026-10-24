// Finding colleagues named as "@Full Name" in a text. Shared by the browser (to notify after a save) and the server (comments).
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Ids of the colleagues named as "@Full Name" (the name must be followed by a space, punctuation or the end). staff = [{id, name}] */
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
