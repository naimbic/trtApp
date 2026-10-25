// Item descriptions came from the old system as HTML (and sometimes as escaped HTML such as "&lt;p&gt;"). These helpers show
// them properly: cleanHtml keeps a short list of harmless tags, plainText turns them into lines of text. Pure (no DOM), shared by
// the screens and the documents.
const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“', '&ndash;': '–', '&mdash;': '—', '&euro;': '€', '&hellip;': '…' }
const decode = (s) => String(s).replace(/&(?:nbsp|amp|lt|gt|quot|apos|rsquo|lsquo|rdquo|ldquo|ndash|mdash|euro|hellip|#39);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** "&lt;p&gt;Hello&lt;/p&gt;" becomes "<p>Hello</p>"; text that is not escaped HTML is left alone. */
export const unescapeHtml = (s) => (/&lt;\/?[a-z][^&]*&gt;/i.test(String(s ?? '')) ? String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&') : String(s ?? ''))

export const looksLikeHtml = (s) => /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(unescapeHtml(s))

const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'sub', 'sup', 'code', 'pre', 'a', 'img', 'mark'])
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
        // colour, highlight and alignment: only a plain colour value or a keyword, never anything else from a style
        const style = (/style\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs) || [])
        const css = (style[1] ?? style[2] ?? '').toLowerCase()
        const colorOf = (prop) => { const c = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(#[0-9a-f]{3,8}|rgba?\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*(?:,\\s*[\\d.]+\\s*)?\\))\\s*(?:;|$)`).exec(css); return c ? c[1] : '' }
        if (name === 'span') { const parts = [colorOf('color') && `color:${colorOf('color')}`, colorOf('background-color') && `background-color:${colorOf('background-color')}`].filter(Boolean); return parts.length ? `<span style="${parts.join(';')}">` : '<span>' }
        if (name === 'mark') { const dc = /data-color\s*=\s*"(#[0-9a-f]{3,8})"/i.exec(attrs); const bg = colorOf('background-color') || (dc ? dc[1] : ''); return bg ? `<mark style="background-color:${bg}">` : '<mark>' }
        if (['p', 'h1', 'h2', 'h3', 'blockquote', 'li'].includes(name)) { const al = /(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/.exec(css); if (al) return `<${name} style="text-align:${al[1]}">` }
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

/* ---------- email signatures: richer HTML (tables, inline styles, pictures) kept safe ---------- */
const EMAIL_TAGS = new Set([...ALLOWED, 'font', 'center', 'small', 'big', 'tfoot', 'caption', 'colgroup', 'col', 'figure', 'figcaption', 'address', 'cite', 'strike', 'del', 'ins', 'mark'])
const SAFE_PROP = /^(color|background-color|background|font|font-family|font-size|font-weight|font-style|text-decoration|text-align|text-transform|vertical-align|line-height|letter-spacing|white-space|word-break|(padding|margin)(-top|-right|-bottom|-left)?|border(-top|-right|-bottom|-left)?(-width|-style|-color|-radius)?|border-collapse|border-spacing|(min-|max-)?(width|height)|display)$/
const colorOk = (v) => /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)|[a-z]{3,20}|transparent)$/i.test(v)

/** A style attribute reduced to safe properties: no url(), no expressions, no scripts. */
export function cleanStyle(css) {
    const out = []
    for (const part of String(css || '').split(';')) {
        const i = part.indexOf(':')
        if (i < 0) continue
        const prop = part.slice(0, i).trim().toLowerCase()
        const val = part.slice(i + 1).trim()
        if (!SAFE_PROP.test(prop) || !val || /url\s*\(|expression|javascript:|@import|[<>\\]|-moz-binding|behavior/i.test(val)) continue
        if (prop === 'display' && !/^(block|inline|inline-block|table|table-cell|none)$/i.test(val)) continue
        if (/^(color|background-color)$/.test(prop) && !colorOk(val)) continue
        if (prop === 'background' && !colorOk(val)) continue
        out.push(`${prop}:${val}`)
    }
    return out.join(';')
}

const attrOf = (attrs, name) => { const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attrs); return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null }
const NUM = /^\d{1,4}%?$/

/** Signature HTML the person typed or pasted: tables, inline styles, links and https pictures stay; scripts, events and anything unsafe go. */
export function cleanEmailHtml(input) {
    const raw = String(input ?? '').trim()
    if (!raw) return ''
    if (!looksLikeHtml(raw)) return escapeHtml(decode(raw)).replace(/\r?\n/g, '<br>')
    let t = raw.replace(/<(script|style|iframe|object|embed|form|svg|math|link|meta|base|input|button|textarea|select)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<(script|style|iframe|object|embed|form|svg|math|link|meta|base|input|button|textarea|select)\b[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
    t = t.replace(/<(?![a-z/])/gi, '&lt;')
    t = t.replace(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi, (m, slash, tag, attrs) => {
        const name = tag.toLowerCase()
        if (!EMAIL_TAGS.has(name)) return ''
        if (slash) return VOID.has(name) ? '' : `</${name}>`
        const a = []
        const style = cleanStyle(attrOf(attrs, 'style'))
        if (style) a.push(`style="${escapeHtml(style)}"`)
        if (name === 'a') {
            const url = (attrOf(attrs, 'href') || '').trim()
            if (/^(https?:|mailto:|tel:)/i.test(url)) a.push(`href="${escapeHtml(decode(url))}"`, 'target="_blank"', 'rel="noopener noreferrer"')
        } else if (name === 'img') {
            const src = (attrOf(attrs, 'src') || '').trim()
            if (!/^(https?:\/\/|\/(?!\/))/i.test(src)) return ''
            a.push(`src="${escapeHtml(decode(src))}"`, `alt="${escapeHtml(decode(attrOf(attrs, 'alt') || ''))}"`)
            for (const k of ['width', 'height']) { const v = attrOf(attrs, k); if (v && NUM.test(v)) a.push(`${k}="${v}"`) }
        } else {
            for (const k of ['width', 'height', 'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan']) { const v = attrOf(attrs, k); if (v && NUM.test(v) && ['table', 'td', 'th', 'tr', 'col', 'colgroup'].includes(name)) a.push(`${k}="${v}"`) }
            const al = attrOf(attrs, 'align'); if (al && /^(left|right|center|justify)$/i.test(al)) a.push(`align="${al.toLowerCase()}"`)
            const va = attrOf(attrs, 'valign'); if (va && /^(top|middle|bottom|baseline)$/i.test(va)) a.push(`valign="${va.toLowerCase()}"`)
            const bg = attrOf(attrs, 'bgcolor'); if (bg && colorOk(bg)) a.push(`bgcolor="${bg}"`)
            if (name === 'font') { const c = attrOf(attrs, 'color'); if (c && colorOk(c)) a.push(`color="${c}"`); const sz = attrOf(attrs, 'size'); if (sz && /^[1-7]$/.test(sz)) a.push(`size="${sz}"`) }
        }
        return `<${name}${a.length ? ` ${a.join(' ')}` : ''}>`
    })
    return t
}
