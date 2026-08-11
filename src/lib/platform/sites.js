import crypto from 'crypto'
import prisma from '@/lib/prisma'

/**
 * Central registry + auth for TRT "spoke" sites that call this hub's Platform
 * API. Each site holds a hashed API key; the raw key is shown once at creation
 * and never stored. Spokes send it as the `x-api-key` header.
 */

export const DEFAULT_SITE_SLUG = 'trtmaroc'

// ---- API key helpers --------------------------------------------------------

/** Generate a new raw key + the values we persist (prefix + sha256 hash). */
export function generateApiKey(slug) {
    const secret = crypto.randomBytes(24).toString('base64url')
    const raw = `trt_${slug}_${secret}`
    return {
        raw,
        prefix: raw.slice(0, 16),
        hash: hashApiKey(raw),
    }
}

export function hashApiKey(raw) {
    return crypto.createHash('sha256').update(String(raw)).digest('hex')
}

// ---- Site cache (short TTL to avoid a DB hit per request) --------------------

let cache = { at: 0, sites: [] }
const TTL = 30_000

async function getActiveSites() {
    const now = Date.now()
    if (now - cache.at < TTL && cache.sites.length) return cache.sites
    const sites = await prisma.site.findMany({ where: { active: true } })
    cache = { at: now, sites }
    return sites
}

/** Call after any create/update/delete so the next request sees fresh data. */
export function invalidateSiteCache() {
    cache = { at: 0, sites: [] }
}

// ---- Resolution -------------------------------------------------------------

function readApiKey(request) {
    return (
        request.headers.get('x-api-key') ||
        request.headers.get('x-trt-key') ||
        ''
    ).trim()
}

/** Resolve a site strictly from a valid API key. Returns the Site or null. */
export async function resolveSiteFromKey(request) {
    const key = readApiKey(request)
    if (!key) return null
    const hash = hashApiKey(key)
    const sites = await getActiveSites()
    return sites.find((s) => s.apiKeyHash === hash) || null
}

/** Find a site whose configured origins include the request Origin. */
export async function resolveSiteFromOrigin(request) {
    const origin = request?.headers?.get('origin') || ''
    if (!origin) return null
    const sites = await getActiveSites()
    return sites.find((s) => (s.origins || []).includes(origin)) || null
}

/**
 * Backward-compatible resolver used by the public ingest routes during the
 * migration window:
 *   1. valid API key wins,
 *   2. else a registered Origin,
 *   3. else fall back to the default (legacy trtmaroc) site slug.
 * Returns { site, slug, source } — `site` may be null if only the slug fallback
 * applied (no registry row yet), which callers treat as trtmaroc.
 */
export async function resolveSite(request) {
    const byKey = await resolveSiteFromKey(request)
    if (byKey) return { site: byKey, slug: byKey.slug, source: 'key' }

    const byOrigin = await resolveSiteFromOrigin(request)
    if (byOrigin) return { site: byOrigin, slug: byOrigin.slug, source: 'origin' }

    return { site: null, slug: DEFAULT_SITE_SLUG, source: 'legacy' }
}

/** All origins across every active site (for dynamic CORS). */
export async function getAllowedOrigins() {
    const sites = await getActiveSites()
    return sites.flatMap((s) => s.origins || [])
}
