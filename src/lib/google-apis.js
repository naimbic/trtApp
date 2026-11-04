import { google } from 'googleapis'

// Force OpenSSL legacy provider for hosts with OpenSSL 3.x (e.g. Hostinger)
// This must run before any crypto operations
try {
    const crypto = await import('crypto')
    crypto.constants // touch to ensure module loaded
} catch {}

// --- Auth ---
function getAuth(scopes) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    if (!email || !key) return null

    const auth = new google.auth.GoogleAuth({
        credentials: { client_email: email, private_key: key },
        scopes,
    })
    return auth
}

export function isGA4Configured() {
    return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GA4_PROPERTY_ID)
}

export function isSCConfigured() {
    return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.SEARCH_CONSOLE_SITE_URL)
}

// --- GA4 ---
export async function fetchGA4Visitors(startDate, endDate) {
    if (!isGA4Configured()) return null
    try {
        const auth = getAuth(['https://www.googleapis.com/auth/analytics.readonly'])
        const analytics = google.analyticsdata({ version: 'v1beta', auth })
        const res = await analytics.properties.runReport({
            property: `properties/${process.env.GA4_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'date' }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'activeUsers' },
                    { name: 'screenPageViews' },
                ],
                orderBys: [{ dimension: { dimensionName: 'date' } }],
            },
        })
        return (res.data.rows || []).map(r => ({
            date: r.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
            sessions: parseInt(r.metricValues[0].value) || 0,
            users: parseInt(r.metricValues[1].value) || 0,
            pageviews: parseInt(r.metricValues[2].value) || 0,
        }))
    } catch (e) {
        console.error('fetchGA4Visitors error:', e.message, e.code, e.status)
        return null
    }
}

// --- Search Console ---
async function scQuery(params) {
    if (!isSCConfigured()) return null
    try {
        const auth = getAuth(['https://www.googleapis.com/auth/webmasters.readonly'])
        const sc = google.searchconsole({ version: 'v1', auth })
        const res = await sc.searchanalytics.query({
            siteUrl: process.env.SEARCH_CONSOLE_SITE_URL,
            requestBody: params,
        })
        return res.data.rows || []
    } catch (e) {
        console.error('scQuery error:', e.message, e.code, e.status)
        return null
    }
}

export async function fetchKeywordPositions(startDate, endDate, limit = 25) {
    const rows = await scQuery({
        startDate, endDate,
        dimensions: ['query'],
        rowLimit: limit,
        type: 'web',
    })
    if (!rows) return null
    return rows.map(r => ({
        keyword: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round(r.ctr * 1000) / 10,
        position: Math.round(r.position * 10) / 10,
    }))
}

export async function fetchSearchTraffic(startDate, endDate) {
    // Aggregated totals
    const agg = await scQuery({ startDate, endDate, type: 'web' })
    // Unique keyword count
    const kwRows = await scQuery({
        startDate, endDate,
        dimensions: ['query'],
        rowLimit: 25000,
        type: 'web',
    })
    if (!agg || !agg.length) return null
    const row = agg[0] || {}
    return {
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        keywords: kwRows ? kwRows.length : 0,
        avgPosition: Math.round((row.position || 0) * 10) / 10,
    }
}

export async function fetchTopPages(startDate, endDate, limit = 20) {
    const rows = await scQuery({
        startDate, endDate,
        dimensions: ['page'],
        rowLimit: limit,
        type: 'web',
    })
    if (!rows) return null
    return rows.map(r => ({
        page: new URL(r.keys[0]).pathname,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round(r.ctr * 1000) / 10,
        position: Math.round(r.position * 10) / 10,
    }))
}

export async function fetchDeviceBreakdown(startDate, endDate) {
    const rows = await scQuery({
        startDate, endDate,
        dimensions: ['device'],
        type: 'web',
    })
    if (!rows) return null
    return rows.map(r => ({
        device: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round(r.ctr * 1000) / 10,
        position: Math.round(r.position * 10) / 10,
    }))
}

export async function fetchCountryBreakdown(startDate, endDate, limit = 10) {
    const rows = await scQuery({
        startDate, endDate,
        dimensions: ['country'],
        rowLimit: limit,
        type: 'web',
    })
    if (!rows) return null
    return rows.map(r => ({
        country: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round(r.ctr * 1000) / 10,
        position: Math.round(r.position * 10) / 10,
    }))
}

export async function fetchIndexedPages(startDate, endDate) {
    const rows = await scQuery({
        startDate, endDate,
        dimensions: ['page'],
        rowLimit: 5000,
        type: 'web',
    })
    if (!rows) return null
    return rows.map(r => {
        try { return new URL(r.keys[0]).pathname } catch { return r.keys[0] }
    })
}

// --- URL Inspection API (real index status) ---
export async function inspectUrl(url) {
    if (!isSCConfigured()) return null
    try {
        const auth = getAuth(['https://www.googleapis.com/auth/webmasters.readonly'])
        const sc = google.searchconsole({ version: 'v1', auth })
        const res = await sc.urlInspection.index.inspect({
            requestBody: {
                inspectionUrl: url,
                siteUrl: process.env.SEARCH_CONSOLE_SITE_URL,
            },
        })
        const result = res.data?.inspectionResult?.indexStatusResult
        return {
            verdict: result?.verdict || 'UNKNOWN',
            coverageState: result?.coverageState || 'Unknown',
            robotsTxtState: result?.robotsTxtState || 'UNKNOWN',
            indexingState: result?.indexingState || 'UNKNOWN',
            lastCrawlTime: result?.lastCrawlTime || null,
            pageFetchState: result?.pageFetchState || 'UNKNOWN',
            crawledAs: result?.crawledAs || 'UNKNOWN',
        }
    } catch (e) {
        console.error('inspectUrl error:', e.message)
        return null
    }
}

// Batch inspect multiple URLs (with rate limiting — 1 req/sec for Inspection API)
export async function batchInspectUrls(urls, delayMs = 600) {
    const results = {}
    for (const url of urls) {
        const r = await inspectUrl(url)
        if (r) results[url] = r
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs))
    }
    return results
}

// --- Indexing API ---
export async function requestIndexing(url) {
    try {
        const auth = getAuth([
            'https://www.googleapis.com/auth/indexing',
            'https://www.googleapis.com/auth/webmasters',
        ])
        const indexing = google.indexing({ version: 'v3', auth })
        const res = await indexing.urlNotifications.publish({
            requestBody: { url, type: 'URL_UPDATED' },
        })
        return { success: true, method: 'indexing-api', data: res.data }
    } catch (e) {
        // Fallback: Google ping
        try {
            await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) })
            return { success: true, method: 'google-ping', message: 'Pinged Google' }
        } catch {
            return { success: false, error: e.message }
        }
    }
}

export async function requestRemoval(url) {
    try {
        const auth = getAuth([
            'https://www.googleapis.com/auth/indexing',
            'https://www.googleapis.com/auth/webmasters',
        ])
        const indexing = google.indexing({ version: 'v3', auth })
        const res = await indexing.urlNotifications.publish({
            requestBody: { url, type: 'URL_DELETED' },
        })
        return { success: true, method: 'indexing-api', data: res.data }
    } catch (e) {
        return { success: false, error: e.message, message: 'Use Search Console UI to request removal' }
    }
}
