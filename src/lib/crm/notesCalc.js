// What a note may hold, cleaned. No database, no network: tested on its own.
export const COLORS = ['yellow', 'red', 'orange', 'green', 'teal', 'blue', 'purple', 'pink', 'gray']
export const KINDS = ['note', 'list']
const id = () => Math.random().toString(36).slice(2, 10)

export const cleanColor = (c) => (COLORS.includes(c) ? c : null)

/** The items of a checklist: text kept short, ids kept or made, at most 200. */
export function cleanChecklist(list) {
    if (!Array.isArray(list)) return []
    return list.slice(0, 200).map((x) => ({ id: String(x?.id || id()).slice(0, 20), text: String(x?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 300), done: !!x?.done })).filter((x) => x.text)
}

export function cleanLabels(list) {
    const seen = new Set()
    const out = []
    for (const l of Array.isArray(list) ? list : []) {
        const t = String(l ?? '').replace(/\s+/g, ' ').replace(/^#/, '').trim().slice(0, 30)
        if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t) }
    }
    return out.slice(0, 10)
}

/** Web links: only http(s), the address made safe, a short title. */
export function cleanLinks(list) {
    const out = []
    for (const l of Array.isArray(list) ? list : []) {
        let raw = String(l?.url ?? '').trim()
        if (raw && !/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`
        let u
        try { u = new URL(raw) } catch { continue }
        if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) continue
        if (out.some((x) => x.url === u.href)) continue
        out.push({ url: u.href.slice(0, 500), title: String(l?.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) })
    }
    return out.slice(0, 20)
}

const KIND_OF = ['image', 'audio', 'video', 'pdf', 'doc', 'sheet', 'slides', 'archive', 'text']
/** Files of a note: only those uploaded through the notes upload (their address starts with `prefix`). */
export function cleanAttachments(list, prefix) {
    const out = []
    for (const a of Array.isArray(list) ? list : []) {
        const url = String(a?.url ?? '')
        if (!url.startsWith(prefix)) continue
        if (out.some((x) => x.url === url)) continue
        out.push({ url, name: String(a?.name || 'file').slice(0, 120), mime: String(a?.mime || '').slice(0, 80), size: Number(a?.size) || 0, kind: KIND_OF.includes(a?.kind) ? a.kind : 'file' })
    }
    return out.slice(0, 20)
}

/** The order of the cards: pinned first, then important, then the most recently changed. */
export function sortNotes(list) {
    return [...list].sort((a, b) => (!!b.pinned - !!a.pinned) || (!!b.important - !!a.important) || (+new Date(b.updatedAt) - +new Date(a.updatedAt)))
}

/** Is there anything in this note worth saving? */
export const isEmptyNote = ({ title, text, checklist, attachments, links }) => !String(title || '').trim() && !String(text || '').trim() && !(checklist || []).length && !(attachments || []).length && !(links || []).length
