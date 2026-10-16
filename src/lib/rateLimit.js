// A small sliding-window rate limiter kept in memory (one server process: enough to stop floods and guessing; a
// restart resets the counters). rateLimit(key, max, windowMs) throws a 429 error with `retryAfter` seconds.
const hits = new Map()
let sweptAt = 0

export function rateLimit(key, max, windowMs) {
    const now = Date.now()
    if (now - sweptAt > 60000) { // forget keys that have been quiet for a while
        sweptAt = now
        for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 3600000) hits.delete(k)
    }
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
    if (list.length >= max) {
        const retryAfter = Math.max(1, Math.ceil((windowMs - (now - list[0])) / 1000))
        hits.set(key, list)
        throw Object.assign(new Error(`Too many requests. Try again in ${retryAfter < 90 ? `${retryAfter} seconds` : `${Math.ceil(retryAfter / 60)} minutes`}.`), { status: 429, retryAfter })
    }
    list.push(now)
    hits.set(key, list)
}

/** The caller's address behind the proxy (first X-Forwarded-For entry). */
export const clientIp = (request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
