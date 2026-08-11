/**
 * Lightweight, dependency-free detection of device type and traffic channel
 * from the User-Agent and Referrer captured at analytics ingest. Good enough
 * for first-party dashboard breakdowns without a heavy UA-parsing library.
 */

export function detectDevice(ua = '') {
    const s = String(ua).toLowerCase()
    if (!s) return 'unknown'
    if (/ipad|tablet|(android(?!.*mobile))|kindle|silk|playbook/.test(s)) return 'tablet'
    if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/.test(s)) return 'mobile'
    return 'desktop'
}

const SEARCH_HOSTS = /(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia|brave)\./
const SOCIAL_HOSTS =
    /(facebook|fb\.|instagram|twitter|t\.co|x\.com|linkedin|lnkd\.in|youtube|youtu\.be|tiktok|pinterest|reddit|snapchat|whatsapp|wa\.me|telegram|t\.me)/

/**
 * Classify a channel from referrer + optional UTM medium.
 * Returns one of: direct, organic, social, paid, email, referral.
 */
export function detectChannel(referrer = '', utmMedium = '') {
    const m = String(utmMedium).toLowerCase()
    if (m) {
        if (/cpc|ppc|paid|cpm|display/.test(m)) return 'paid'
        if (/email|newsletter/.test(m)) return 'email'
        if (/social|social-network|social-media/.test(m)) return 'social'
        if (/organic/.test(m)) return 'organic'
        if (/referral/.test(m)) return 'referral'
    }
    const r = String(referrer).toLowerCase()
    if (!r) return 'direct'
    if (SOCIAL_HOSTS.test(r)) return 'social'
    if (SEARCH_HOSTS.test(r)) return 'organic'
    return 'referral'
}

/** Best-effort country from Cloudflare / common proxy headers. */
export function detectCountry(request) {
    return (
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('x-country') ||
        null
    )
}
