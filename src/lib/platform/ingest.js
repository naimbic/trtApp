import { corsHeaders, refreshCors } from '@/lib/cors'
import { resolveSite } from '@/lib/platform/sites'

/**
 * Shared front-matter for the public Platform ingest routes
 * (/api/submissions, /api/404-log, /api/platform/events):
 *   - refresh dynamic CORS from the Site registry
 *   - resolve the calling site (API key → origin → legacy trtmaroc)
 *   - optionally enforce a valid API key (PLATFORM_REQUIRE_KEY=true)
 *   - per-site + per-IP in-memory rate limit
 *
 * Returns { site, slug, source, headers, error }. If `error` is set, the caller
 * should return NextResponse.json({...}, { status: error.status, headers }).
 */
const buckets = new Map()

export async function guardIngest(request, { rateMs = 5000 } = {}) {
    await refreshCors()
    const headers = corsHeaders(request)

    const { site, slug, source } = await resolveSite(request)

    // Security: once every spoke sends its key, flip PLATFORM_REQUIRE_KEY=true
    // to reject anonymous/legacy calls.
    if (process.env.PLATFORM_REQUIRE_KEY === 'true' && source !== 'key') {
        return {
            site,
            slug,
            source,
            headers,
            error: { status: 401, message: 'A valid x-api-key header is required.' },
        }
    }

    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const bucketKey = `${slug}:${ip}`
    const now = Date.now()
    const last = buckets.get(bucketKey)
    if (last && now - last < rateMs) {
        return {
            site,
            slug,
            source,
            headers,
            error: { status: 429, message: 'Rate limited. Please try again shortly.' },
        }
    }
    buckets.set(bucketKey, now)

    return { site, slug, source, headers, error: null }
}
