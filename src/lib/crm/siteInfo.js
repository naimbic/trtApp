import dns from 'node:dns/promises'
import net from 'node:net'
import tls from 'node:tls'
import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/crm/permissions'
import { open } from '@/lib/crm/ai/secret'
import { callTool } from '@/lib/crm/mcpClient'
import { hostOf, rootDomain, isPrivateIp, readRdap, readWhois, summary, decodeEntities } from '@/lib/crm/siteInfoCalc'

/**
 * What a salesperson wants to know about the website of a lead, on hover: is it online, how old is the domain, who hosts it, and its
 * SEO figures (Ahrefs, else Ubersuggest, whichever key is saved in Settings → AI). Every address the server calls is checked to be public first.
 */
const UA = 'Mozilla/5.0 (compatible; trtCRM-site-check/1.0)'
const cache = new Map() // host -> { at, data }
const TTL = 15 * 60000, SEO_TTL = 24 * 3600000
const seoCache = new Map()
const SEO_URL = 'https://ubersuggest-mcp.neilpatelapi.com/mcp'

const timeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out`)), ms))])

/** The public addresses of a host; throws when it has none or points inside the server's network. */
async function publicAddresses(host) {
    const list = net.isIP(host) ? [{ address: host }] : await timeout(dns.lookup(host, { all: true }), 4000, 'DNS')
    if (!list.length || list.some((a) => isPrivateIp(a.address))) throw new Error('not a public address')
    return list.map((a) => a.address)
}

async function checkSite(host, startUrl) {
    const out = { online: false, status: null, ms: null, finalUrl: '', redirected: false, title: '', server: '', generator: '', ssl: null, error: '' }
    let url = startUrl
    const t0 = Date.now()
    try {
        for (let hop = 0; hop < 5; hop++) {
            await publicAddresses(hostOf(url))
            const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(7000) })
            out.status = res.status; out.server = res.headers.get('server') || out.server
            if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { url = new URL(res.headers.get('location'), url).toString(); out.redirected = true; await res.body?.cancel().catch(() => {}); continue }
            out.ms = Date.now() - t0; out.online = res.status < 500; out.finalUrl = url
            const ct = res.headers.get('content-type') || ''
            if (/html/i.test(ct) && res.body) {
                const reader = res.body.getReader(); let html = '', n = 0
                while (n < 120000) { const { done, value } = await reader.read(); if (done) break; html += Buffer.from(value).toString('utf8'); n += value.length; if (/<\/head>/i.test(html)) break }
                reader.cancel().catch(() => {})
                out.title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 120)
                const meta = (re) => (re.exec(html)?.[1] || '').trim()
                out.desc = decodeEntities(meta(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || meta(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)).slice(0, 400)
                out.viewport = /<meta[^>]+name=["']viewport["']/i.test(html)
                out.canonical = !!/<link[^>]+rel=["']canonical["']/i.test(html)
                out.noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
                out.lang = meta(/<html[^>]+lang=["']([^"']+)/i).slice(0, 12)
                out.og = /<meta[^>]+property=["']og:title["']/i.test(html)
                out.generator = (/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i.exec(html)?.[1] || '').slice(0, 60)
            } else await res.body?.cancel().catch(() => {})
            break
        }
        if (!out.finalUrl && out.status) { out.online = true; out.finalUrl = url }
    } catch (e) { out.error = /not a public/.test(e.message) ? 'not a public website' : /abort|timeout|timed out/i.test(e.message) ? 'no answer' : /ENOTFOUND|EAI_AGAIN/.test(`${e.cause?.code} ${e.message}`) ? 'the domain does not exist' : String(e.cause?.code || e.message).slice(0, 60) }
    if (out.online && out.finalUrl) {
        // the two files every search engine asks for first
        const origin = new URL(out.finalUrl).origin
        const probe = async (path, ok) => { try { const r = await fetch(origin + path, { redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(5000) }); const t = r.status === 200 ? (await r.text()).slice(0, 4000) : ''; return !!t && ok(t) } catch { return false } }
        ;[out.robots, out.sitemap] = await Promise.all([probe('/robots.txt', (t) => !/<html/i.test(t)), probe('/sitemap.xml', (t) => /<urlset|<sitemapindex/i.test(t))])
    }
    const finalHost = hostOf(out.finalUrl || url)
    if (out.online && /^https:/i.test(out.finalUrl || url) && finalHost && !net.isIP(finalHost)) out.ssl = await sslOf(finalHost).catch(() => null)
    return out
}

const sslOf = (host) => new Promise((resolve, reject) => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 5000 }, () => {
        const c = s.getPeerCertificate()
        s.end()
        resolve(c?.valid_to ? { validTo: new Date(c.valid_to).toISOString(), issuer: c.issuer?.O || c.issuer?.CN || '' } : null)
    })
    s.on('error', reject); s.on('timeout', () => { s.destroy(); reject(new Error('timeout')) })
})

async function dnsOf(domain) {
    const [ip, ns, mx] = await Promise.allSettled([timeout(dns.resolve4(domain), 4000, 'DNS'), timeout(dns.resolveNs(domain), 4000, 'DNS'), timeout(dns.resolveMx(domain), 4000, 'DNS')])
    return { ip: ip.status === 'fulfilled' ? ip.value.slice(0, 3) : [], ns: ns.status === 'fulfilled' ? ns.value.map((x) => x.toLowerCase()).slice(0, 4) : [], mx: mx.status === 'fulfilled' ? [...new Set(mx.value.sort((a, b) => a.priority - b.priority).map((x) => rootDomain(x.exchange.toLowerCase())).filter(Boolean))].slice(0, 3) : [] }
}

const whoisQuery = (server, q) => new Promise((resolve, reject) => {
    const s = net.connect({ host: server, port: 43, timeout: 6000 }, () => s.write(`${q}\r\n`))
    let data = ''
    s.on('data', (d) => { data += d; if (data.length > 30000) s.destroy() })
    s.on('close', () => resolve(data)); s.on('timeout', () => { s.destroy(); reject(new Error('timeout')) }); s.on('error', reject)
})

async function whoisOf(domain) {
    try {
        const r = await fetch(`https://rdap.org/domain/${domain}`, { headers: { accept: 'application/rdap+json, application/json' }, signal: AbortSignal.timeout(6000) })
        if (r.ok) { const w = readRdap(await r.json()); if (w) return w }
    } catch { /* the registry has no RDAP: the classic whois below */ }
    try {
        const tld = domain.split('.').pop()
        const refer = /^\s*(?:refer|whois):\s*(\S+)/im.exec(await whoisQuery('whois.iana.org', tld))?.[1]
        if (!refer || !(await publicAddresses(refer).then(() => true, () => false))) return null
        return readWhois(await whoisQuery(refer, domain))
    } catch { return null }
}

/** The Ubersuggest key saved in Settings → AI (sealed), or null. */
async function seoKey() {
    const r = await prisma.crmOption.findMany({ where: { name: { in: ['ubersuggest_key', 'ubersuggest_url'] } } })
    const o = Object.fromEntries(r.map((x) => [x.name, x.value]))
    const key = o.ubersuggest_key ? open(o.ubersuggest_key) : null
    return key ? { key, url: o.ubersuggest_url || SEO_URL } : null
}

/** The Ahrefs API key saved in Settings → AI (sealed), or null. */
async function ahrefsKey() {
    const r = await prisma.crmOption.findFirst({ where: { name: 'ahrefs_key' } })
    return r?.value ? open(r.value) : null
}

/** The public address this server calls from (what a service that limits keys by IP must be given); '' when it cannot be found. */
async function egressIp() {
    try { const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) }); return String((await r.json()).ip || '') } catch { return '' }
}
/** A refused key, with the reason the service gave and the address it saw. */
async function refused(name, res) {
    const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 140)
    const ip = await egressIp()
    return new Error(`The ${name} key was refused (${res.status}${body ? `: ${body}` : ''})${ip ? `. This server calls from IP ${ip}: if the service limits keys by IP, add exactly this one` : ''}`)
}

/** Open PageRank (free key from openpagerank.com): a 0-10 authority score and the world rank of the domain. */
async function openPageRankOf(domain, key, fetchFn = fetch) {
    const res = await fetchFn(`https://openpagerank.keywordseverywhere.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`, { headers: { 'API-OPR': key, accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
    if (res.status === 401 || res.status === 403) throw await refused('Open PageRank', res)
    if (!res.ok) throw new Error(`Open PageRank answered ${res.status}`)
    const r = (await res.json()).response?.[0]
    if (!r || r.status_code !== 200) return { opr: null, rank: null, source: 'Open PageRank' }
    return { opr: r.page_rank_decimal ?? r.page_rank_integer ?? null, rank: r.rank ? Number(r.rank) : null, source: 'Open PageRank' }
}

/** Ahrefs API v3: domain rating, organic traffic and keywords, backlinks and referring domains of a domain. */
async function ahrefsOf(domain, key, fetchFn = fetch) {
    const date = new Date().toISOString().slice(0, 10)
    const get = async (path, extra = '') => {
        const res = await fetchFn(`https://api.ahrefs.com/v3/site-explorer/${path}?target=${encodeURIComponent(domain)}&date=${date}${extra}`, { headers: { authorization: `Bearer ${key}`, accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
        if (res.status === 401 || res.status === 403) throw await refused('Ahrefs', res)
        if (!res.ok) throw new Error(`Ahrefs answered ${res.status}: ${(await res.text()).slice(0, 120)}`)
        return res.json()
    }
    const [dr, m, bl] = await Promise.all([get('domain-rating'), get('metrics', '&mode=subdomains'), get('backlinks-stats', '&mode=subdomains')])
    return { da: dr.domain_rating?.domain_rating != null ? Math.round(dr.domain_rating.domain_rating) : null, traffic: m.metrics?.org_traffic ?? null, keywords: m.metrics?.org_keywords ?? null, backlinks: bl.metrics?.live ?? null, refDomains: bl.metrics?.live_refdomains ?? null, source: 'Ahrefs' }
}

/** Domain authority, organic traffic and keywords, backlinks and referring domains: Ahrefs when its key is saved, else the Ubersuggest MCP. */
export async function seoOf(domain) {
    const hit = seoCache.get(domain)
    if (hit && Date.now() - hit.at < SEO_TTL) return hit.data
    const ah = await ahrefsKey()
    const cfg = await seoKey()
    const opr = (await prisma.crmOption.findFirst({ where: { name: 'openpagerank_key' } }))?.value
    const oprKey = opr ? open(opr) : null
    if (!ah && !cfg && !oprKey) return null
    // the sources in order (Ahrefs, Ubersuggest, Open PageRank): the first one that answers; a refused key falls through to the next
    let data, lastErr = ''
    for (const source of [ah && 'ahrefs', cfg && 'uber', oprKey && 'opr'].filter(Boolean)) {
        try {
            if (source === 'ahrefs') data = await ahrefsOf(domain, ah)
            else if (source === 'opr') data = await openPageRankOf(domain, oprKey)
            else {
                const j = await callTool({ url: cfg.url, token: cfg.key, name: 'domain_overview', args: { domain } })
                data = { da: j.domainAuthority ?? null, traffic: j.traffic ?? null, keywords: j.organic ?? null, backlinks: j.backlinks ?? null, refDomains: j.refDomains ?? null, source: 'Ubersuggest' }
            }
            break
        } catch (e) { lastErr = e.message }
    }
    if (!data) return { error: lastErr } // an error is not kept: the next hover tries again
    seoCache.set(domain, { at: Date.now(), data })
    return data
}

/** Everything about a website, for the tooltip. `force` ignores the short memory. */
export async function siteInfo(website, { force = false } = {}) {
    const session = await requirePermission('leads', 'view')
    void session
    const host = hostOf(website)
    if (!host) { const e = new Error('This is not a web address'); e.status = 400; throw e }
    const hit = cache.get(host)
    if (!force && hit && Date.now() - hit.at < TTL) return hit.data
    const domain = rootDomain(host)
    const url = /^https?:\/\//i.test(String(website).trim()) ? String(website).trim() : `https://${host}`
    const [site, dnsInfo, whois, seo] = await Promise.allSettled([checkSite(host, url), net.isIP(host) ? null : dnsOf(domain), net.isIP(host) ? null : whoisOf(domain), net.isIP(host) ? null : seoOf(domain)])
    const v = (r) => (r.status === 'fulfilled' ? r.value : null)
    const info = { host, domain, openUrl: v(site)?.finalUrl || url, site: v(site), dns: v(dnsInfo), whois: v(whois), seo: v(seo), fetchedAt: new Date().toISOString() }
    info.rows = summary(info)
    cache.set(host, { at: Date.now(), data: info })
    if (cache.size > 500) cache.delete(cache.keys().next().value)
    return info
}

/** The Ubersuggest key for the settings screen. */
export { ahrefsOf, openPageRankOf }
export const SEO_DEFAULT_URL = SEO_URL
