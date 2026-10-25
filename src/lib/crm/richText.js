// Item descriptions came from the old system as HTML (and sometimes as escaped HTML such as "&lt;p&gt;"). These helpers show
// them properly: cleanHtml keeps a short list of harmless tags, plainText turns them into lines of text. Pure (no DOM), shared by
// the screens and the documents.
const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“', '&ndash;': '–', '&mdash;': '—', '&euro;': '€', '&hellip;': '…' }
const decode = (s) => String(s).replace(/&(?:nbsp|amp|lt|gt|quot|apos|rsquo|lsquo|rdquo|ldquo|ndash|mdash|euro|hellip|#39);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** "&lt;p&gt;Hello&lt;/p&gt;" becomes "<p>Hello</p>"; text that is not escaped HTML is left alone. */
export const unescapeHtml = (s) => (/&lt;\/?[a-z][^&]*&gt;/i.test(String(s ?? '')) ? String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&') : String(s ?? ''))

export const looksLikeHtml = (s) => /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(unescapeHtml(s))

const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'sub', 'sup', 'code', 'pre', 'a', 'img'])
const VOID = new Set(['br', 'hr', 'img'])

/** HTML made safe to show: only the tags above, no attributes (links keep an http, https or mailto address), no scripts or styles. Plain text becomes paragraphs with line breaks. */
export function cleanHtml(input) {
    const raw = unescapeHtml(input).trim()
    if (!raw) return ''
    if (!looksLikeHtml(raw)) return escapeHtml(decode(raw)).replace(/\r?\n/g, '<br>')
    let t = raw.replace(/<(script|style|iframe|object|embed|form|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
    t = t.replace(/<(?![a-z/])/gi, '&lt;') // a lone "<" in the text
    t = t.replace(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi, (m, slash, tag, attrs) => {
        const name = tag.toLowerCase()
        if (!ALLOWED.has(name)) return ''
        if (slash) return VOID.has(name) ? '' : `</${name}>`
        if (name === 'img') { // a picture: only from this site or over https, with its description
            if (slash) return ''
            const sm = /src\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)
            const src = (sm?.[1] ?? sm?.[2] ?? '').trim()
            if (!/^(https?:\/\/|\/(?!\/))/i.test(src)) return ''
            const am = /alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)
            return `<img src="${escapeHtml(decode(src))}" alt="${escapeHtml(decode(am?.[1] ?? am?.[2] ?? ''))}" loading="lazy">`
        }
        if (name === 'a') {
            const h = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)
            const url = (h?.[1] ?? h?.[2] ?? '').trim()
            return /^(https?:|mailto:)/i.test(url) ? `<a href="${escapeHtml(decode(url))}" target="_blank" rel="noopener noreferrer">` : '<a>'
        }
        return `<${name}>`
    })
    return t
}

/** The same content as lines of plain text (for inputs, short labels and exports). */
export function plainText(input) {
    const raw = unescapeHtml(input)
    if (!looksLikeHtml(raw)) return decode(raw).trim()
    return decode(raw
        .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, '\n')
        .replace(/<li\b[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, ''))
        .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** What to store for a rich text field: safe HTML when it is HTML, the text as typed otherwise, null when empty. */
export const storeRich = (v, max = 20000) => {
    const s = String(v ?? '').trim()
    if (!s) return null
    const out = looksLikeHtml(s) ? cleanHtml(s) : s
    return plainText(out) || /<img\b/i.test(out) ? out.slice(0, max) : null
}
