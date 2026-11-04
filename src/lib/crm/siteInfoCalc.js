/** The pure part of the website information (no network): addresses, what is safe to call, how long ago, what the tooltip says. */
import net from 'node:net'

/** The host of a lead's website: 'https://www.Example.com/path' -> 'www.example.com'; '' when it is not a public host name. */
export function hostOf(website) {
    const m = /^(?:https?:\/\/)?([^\s/?#:@]+)(?::\d+)?(?:[/?#]|$)/i.exec(String(website || '').trim())
    const h = (m?.[1] || '').toLowerCase().replace(/\.$/, '')
    if (!h || h.length > 253 || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) && !net.isIP(h)) return ''
    return h
}

/** Text of a page title with its HTML entities read (&amp; &quot; &#39; &#x27; &nbsp;). */
export const decodeEntities = (t) => String(t || '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
    const k = e.toLowerCase()
    if (k === 'amp') return '&'; if (k === 'lt') return '<'; if (k === 'gt') return '>'; if (k === 'quot') return '"'; if (k === 'apos') return "'"; if (k === 'nbsp') return ' '
    const n = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10)
    return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
})

/** The registrable part, for the whois and the SEO data (www.example.com -> example.com, shop.site.co.ma -> site.co.ma). */
const SECOND = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu', 'or', 'ne'])
export function rootDomain(host) {
    const p = String(host || '').split('.')
    if (p.length <= 2) return p.join('.')
    return (p.length >= 3 && p[p.length - 1].length === 2 && SECOND.has(p[p.length - 2]) ? p.slice(-3) : p.slice(-2)).join('.')
}

/** True for an address that must never be called from the server (the server's own network). */
export function isPrivateIp(ip) {
    const v = String(ip || '')
    if (net.isIPv4(v)) {
        const [a, b] = v.split('.').map(Number)
        return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    }
    if (net.isIPv6(v)) { const x = v.toLowerCase(); return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb') || x.startsWith('::ffff:') }
    return true
}

const DAY = 86400000
/** '3 years 2 months', '5 months', '12 days': how long ago (or how long until) a date is. */
export function span(from, to = Date.now()) {
    const d = Math.abs(+new Date(to) - +new Date(from))
    const years = Math.floor(d / (365.25 * DAY)), months = Math.floor((d % (365.25 * DAY)) / (30.44 * DAY)), days = Math.floor(d / DAY)
    if (years) return `${years} year${years > 1 ? 's' : ''}${months ? ` ${months} month${months > 1 ? 's' : ''}` : ''}`
    if (months) return `${months} month${months > 1 ? 's' : ''}`
    return `${days} day${days === 1 ? '' : 's'}`
}

/** What RDAP says about a domain, reduced to what a salesperson needs. */
export function readRdap(j) {
    if (!j || typeof j !== 'object') return null
    const ev = (name) => (j.events || []).find((e) => e.eventAction === name)?.eventDate || null
    const registrar = (j.entities || []).find((e) => (e.roles || []).includes('registrar'))
    const vcard = registrar?.vcardArray?.[1]?.find((x) => x[0] === 'fn')?.[3] || registrar?.publicIds?.[0]?.identifier || ''
    return { created: ev('registration'), expires: ev('expiration'), changed: ev('last changed'), registrar: vcard || '', status: (j.status || []).slice(0, 4), nameservers: (j.nameservers || []).map((n) => String(n.ldhName || '').toLowerCase()).filter(Boolean).slice(0, 6) }
}

/** The same from the text of a classic whois answer. */
export function readWhois(text) {
    const t = String(text || '')
    const pick = (...labels) => { for (const l of labels) { const m = new RegExp(`^\\s*${l}\\s*[:.]+\\s*(.+)$`, 'im').exec(t); if (m) return m[1].trim() } return '' }
    const date = (v) => { const d = v ? new Date(v.replace(/\s+\(.*$/, '')) : null; return d && !Number.isNaN(+d) ? d.toISOString() : null }
    const ns = [...t.matchAll(/^\s*(?:name server|nserver|nameserver)s?\s*[:.]+\s*([a-z0-9.-]+)/gim)].map((m) => m[1].toLowerCase())
    const out = { created: date(pick('creation date', 'created', 'registered on', 'registration date', 'domain registration date')), expires: date(pick('registry expiry date', 'expiration date', 'expires', 'expiry date', 'paid-till', 'renewal date')), changed: date(pick('updated date', 'last updated', 'last modified', 'changed')), registrar: pick('registrar', 'sponsoring registrar', 'registrar name'), status: [], nameservers: [...new Set(ns)].slice(0, 6) }
    return out.created || out.expires || out.registrar || out.nameservers.length ? out : null
}

/** One line per fact, the way the tooltip shows them. */
export function summary(info) {
    const rows = []
    const s = info.site
    if (s) rows.push(['Website', s.online ? `Online · ${s.status}${s.ms ? ` · ${s.ms} ms` : ''}` : `Not reachable${s.error ? ` (${s.error})` : ''}`])
    if (s?.finalUrl && s.redirected) rows.push(['Goes to', s.finalUrl])
    if (s?.title) rows.push(['Title', s.title])
    if (s?.server) rows.push(['Server', s.server])
    if (s?.generator) rows.push(['Built with', s.generator])
    if (s?.ssl?.validTo) rows.push(['SSL', `valid until ${s.ssl.validTo.slice(0, 10)}${s.ssl.issuer ? ` · ${s.ssl.issuer}` : ''}`])
    if (s?.online) {
        const mark = (ok) => (ok ? '✓' : '✗')
        const bits = [`Title ${s.title ? `${s.title.length} chars ${mark(s.title.length >= 20 && s.title.length <= 65)}` : '✗'}`, `Description ${s.desc ? `${s.desc.length} chars ${mark(s.desc.length >= 70 && s.desc.length <= 170)}` : '✗'}`, `Mobile ${mark(s.viewport)}`, `Indexable ${mark(!s.noindex)}`, `Canonical ${mark(s.canonical)}`, `robots.txt ${mark(s.robots)}`, `Sitemap ${mark(s.sitemap)}`]
        rows.push(['SEO basics', bits.join(' · ')])
    }
    const w = info.whois
    if (w?.created) rows.push(['Domain age', `${span(w.created)} (since ${w.created.slice(0, 10)})`])
    if (w?.expires) rows.push(['Domain expires', `${w.expires.slice(0, 10)}${+new Date(w.expires) < Date.now() ? ' · expired' : ` · in ${span(w.expires)}`}`])
    if (w?.registrar) rows.push(['Registrar', w.registrar])
    const d = info.dns
    if (d?.ip?.length) rows.push(['IP', d.ip.join(', ')])
    if (d?.ns?.length || w?.nameservers?.length) rows.push(['Name servers', (d?.ns?.length ? d.ns : w.nameservers).join(', ')])
    if (d?.mx?.length) rows.push(['Mail', d.mx.join(', ')])
    return rows
}
