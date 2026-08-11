/**
 * TRT Platform client — drop this file into any spoke site (trtDigital, trtSEA,
 * trtMaroc, trtAds.ma, trtDigitals, trtBlog, or any client site) to send leads,
 * analytics events, and 404s to the central hub (trtApp).
 *
 * Configure two env vars on the spoke:
 *   TRT_PLATFORM_URL   e.g. https://trtmaroc.com        (the hub base URL)
 *   TRT_PLATFORM_KEY   the site's API key from the hub's Sites dashboard
 *
 * SECURITY: the API key must stay server-side. Call these from Route Handlers /
 * server actions / API routes — never expose TRT_PLATFORM_KEY to the browser.
 * (trackEvent/log404 are safe to proxy through your own API route.)
 */

const BASE = process.env.TRT_PLATFORM_URL || ''
const KEY = process.env.TRT_PLATFORM_KEY || ''

async function post(path, body) {
    if (!BASE || !KEY) {
        console.warn('[trt-platform] TRT_PLATFORM_URL / TRT_PLATFORM_KEY not set — skipping', path)
        return { ok: false, skipped: true }
    }
    try {
        const res = await fetch(`${BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
            body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        return { ok: res.ok, status: res.status, ...json }
    } catch (err) {
        console.error('[trt-platform] request failed', path, err)
        return { ok: false, error: String(err) }
    }
}

/**
 * Send a form submission / lead to the hub.
 * @param {object} lead - { form, name, email, phone?, company?, website?, needs?, budget?, budgetMin?, budgetMax?, deadline?, deadlineMonths?, message? }
 *   `form` must be one of: contact, newsletter, lead, candidature,
 *   audit-seo, audit-ads, audit-web, audit-social, audit-aeo, audit-analytics, audit-gratuit
 */
export function trackLead(lead) {
    return post('/api/submissions', lead)
}

/**
 * Send a first-party analytics event.
 * @param {object} ev - { slug, type, referrer?, utmMedium?, country? }
 *   type: 'view' | 'like' | 'share'
 * Or batch: trackEvent({ events: [ {slug,type}, ... ] })
 */
export function trackEvent(ev) {
    return post('/api/platform/events', ev)
}

/** Report a 404 for aggregation on the hub. @param {object} hit - { path, referrer?, ua? } */
export function log404(hit) {
    return post('/api/404-log', hit)
}

export default { trackLead, trackEvent, log404 }
