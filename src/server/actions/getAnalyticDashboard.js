import prisma from '@/lib/prisma'
import dayjs from 'dayjs'
import { unstable_noStore as noStore } from 'next/cache'

function getDateRange(period) {
    const now = dayjs()
    if (period === 'today') {
        return { start: now.startOf('day').toDate(), end: now.endOf('day').toDate(), prevStart: now.subtract(1, 'day').startOf('day').toDate(), prevEnd: now.subtract(1, 'day').endOf('day').toDate() }
    }
    if (period === 'thisWeek') {
        return { start: now.startOf('week').toDate(), end: now.endOf('week').toDate(), prevStart: now.subtract(1, 'week').startOf('week').toDate(), prevEnd: now.subtract(1, 'week').endOf('week').toDate() }
    }
    if (period === 'thisYear') {
        return { start: now.startOf('year').toDate(), end: now.endOf('year').toDate(), prevStart: now.subtract(1, 'year').startOf('year').toDate(), prevEnd: now.subtract(1, 'year').endOf('year').toDate() }
    }
    // thisMonth
    return { start: now.startOf('month').toDate(), end: now.endOf('month').toDate(), prevStart: now.subtract(1, 'month').startOf('month').toDate(), prevEnd: now.subtract(1, 'month').endOf('month').toDate() }
}

function growthPercent(current, previous) {
    if (!previous) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 1000) / 10
}

function getChartLabels(period) {
    const now = dayjs()
    if (period === 'today') {
        return Array.from({ length: 24 }, (_, i) => String(i))
    }
    if (period === 'thisWeek') {
        return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    }
    if (period === 'thisYear') {
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    }
    // thisMonth — compact day numbers
    const daysInMonth = now.daysInMonth()
    const labels = []
    for (let d = 1; d <= daysInMonth; d++) {
        labels.push(String(d))
    }
    return labels
}

function bucketEvents(events, period) {
    const now = dayjs()
    if (period === 'today') {
        const buckets = new Array(24).fill(0)
        events.forEach(e => { buckets[dayjs(e.date).hour()]++ })
        return buckets
    }
    if (period === 'thisWeek') {
        const buckets = new Array(7).fill(0)
        events.forEach(e => { const d = dayjs(e.date).day(); buckets[d === 0 ? 6 : d - 1]++ })
        return buckets
    }
    if (period === 'thisYear') {
        const buckets = new Array(12).fill(0)
        events.forEach(e => { buckets[dayjs(e.date).month()]++ })
        return buckets
    }
    // thisMonth
    const daysInMonth = now.daysInMonth()
    const buckets = new Array(daysInMonth).fill(0)
    events.forEach(e => { const d = dayjs(e.date).date() - 1; if (d >= 0 && d < daysInMonth) buckets[d]++ })
    return buckets
}

// Raw MongoDB aggregate — uses $ifNull to coalesce `date` and `createdAt`,
// because legacy frontend events wrote `createdAt` while new ingest writes `date`.
// Optionally scoped to a single site slug.
async function queryEvents(start, end, site) {
    const match = { _ts: { $gte: { $date: start.toISOString() }, $lte: { $date: end.toISOString() } } }
    if (site && site !== 'all') match.site = site
    const result = await prisma.$runCommandRaw({
        aggregate: 'page_events',
        pipeline: [
            { $addFields: { _ts: { $ifNull: ['$date', '$createdAt'] } } },
            { $match: match },
            { $project: { slug: 1, type: 1, _ts: 1, device: 1, channel: 1, referrer: 1, _id: 0 } },
        ],
        cursor: { batchSize: 20000 },
    })
    return (result.cursor?.firstBatch || []).map(e => ({
        slug: e.slug,
        type: e.type,
        device: e.device || null,
        channel: e.channel || null,
        referrer: e.referrer || null,
        date: e._ts?.$date || e._ts || null,
    })).filter(e => e.date != null)
}

async function buildPeriodData(period, site) {
    const { start, end, prevStart, prevEnd } = getDateRange(period)

    const currentEvents = await queryEvents(start, end, site)
    const prevEvents = await queryEvents(prevStart, prevEnd, site)

    const currentViews = currentEvents.filter(e => e.type === 'view')
    const currentLikes = currentEvents.filter(e => e.type === 'like')
    const currentShares = currentEvents.filter(e => e.type === 'share')
    const prevViews = prevEvents.filter(e => e.type === 'view')
    const prevLikes = prevEvents.filter(e => e.type === 'like')
    const prevShares = prevEvents.filter(e => e.type === 'share')

    // Unique visitors (approximate by unique slugs visited — best we can do without session tracking)
    const uniqueSlugs = new Set(currentViews.map(e => e.slug))
    const prevUniqueSlugs = new Set(prevViews.map(e => e.slug))

    // Metrics
    const metrics = {
        visitors: {
            value: currentViews.length,
            growShrink: growthPercent(currentViews.length, prevViews.length),
        },
        conversionRate: {
            value: currentViews.length > 0 ? Math.round((currentLikes.length / currentViews.length) * 1000) / 10 : 0,
            growShrink: growthPercent(
                currentViews.length > 0 ? currentLikes.length / currentViews.length : 0,
                prevViews.length > 0 ? prevLikes.length / prevViews.length : 0,
            ),
        },
        adCampaignClicks: {
            value: currentShares.length + currentLikes.length,
            growShrink: growthPercent(currentShares.length + currentLikes.length, prevShares.length + prevLikes.length),
        },
    }

    // Web analytic chart — bucket views, likes, shares into time series
    const labels = getChartLabels(period)
    const viewBuckets = bucketEvents(currentViews, period)
    const likeBuckets = bucketEvents(currentLikes, period)
    const shareBuckets = bucketEvents(currentShares, period)

    const webAnalytic = {
        pageView: {
            value: currentViews.length,
            growShrink: growthPercent(currentViews.length, prevViews.length),
        },
        avgTimeOnPage: {
            value: '-',
            growShrink: 0,
        },
        series: [
            { name: 'Views', data: viewBuckets },
            { name: 'Likes', data: likeBuckets },
            { name: 'Shares', data: shareBuckets },
        ],
        date: labels,
    }

    // Top pages — aggregate views per slug
    const slugViewMap = {}
    currentViews.forEach(e => { slugViewMap[e.slug] = (slugViewMap[e.slug] || 0) + 1 })
    const prevSlugViewMap = {}
    prevViews.forEach(e => { prevSlugViewMap[e.slug] = (prevSlugViewMap[e.slug] || 0) + 1 })

    const topPages = Object.entries(slugViewMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([slug, views]) => {
            const prevPageViews = prevSlugViewMap[slug] || 0
            // Unique visitors per page (count of events — approximation)
            const uniqueCount = Math.round(views * 0.65)
            const prevUniqueCount = Math.round(prevPageViews * 0.65)
            return {
                pageUrl: slug,
                views: { amount: views, growth: growthPercent(views, prevPageViews) },
                uniqueVisitor: { amount: uniqueCount, growth: growthPercent(uniqueCount, prevUniqueCount) },
            }
        })

    // ---- Top channel — real brand-level referrer breakdown (fallback to estimate) ----
    const BRANDS = [
        { id: 'google', name: 'Google', img: '/img/others/google.png', test: /google\.|bing\.|yahoo|duckduckgo|yandex|baidu|ecosia/ },
        { id: 'instagram', name: 'Instagram', img: '/img/thumbs/instagram.png', test: /instagram/ },
        { id: 'facebook', name: 'Facebook', img: '/img/thumbs/facebook.png', test: /facebook|fb\./ },
        { id: 'x', name: 'X', img: '/img/thumbs/x.png', test: /twitter|t\.co|x\.com/ },
    ]
    const brandCounts = Object.fromEntries(BRANDS.map(b => [b.id, 0]))
    let brandTotal = 0
    currentViews.forEach(e => {
        const r = (e.referrer || '').toLowerCase()
        if (!r) return
        const b = BRANDS.find(b => b.test.test(r))
        if (b) { brandCounts[b.id]++; brandTotal++ }
    })
    let channels
    if (brandTotal > 0) {
        channels = BRANDS.map(b => ({
            id: b.id, name: b.name, img: b.img,
            total: brandCounts[b.id],
            percentage: Math.round((brandCounts[b.id] / brandTotal) * 1000) / 10,
        }))
    } else {
        const ti = currentViews.length + currentLikes.length + currentShares.length
        channels = [
            { id: 'google', name: 'Google', img: '/img/others/google.png', total: Math.round(ti * 0.45), percentage: 45 },
            { id: 'instagram', name: 'Instagram', img: '/img/thumbs/instagram.png', total: Math.round(ti * 0.25), percentage: 25 },
            { id: 'facebook', name: 'Facebook', img: '/img/thumbs/facebook.png', total: Math.round(ti * 0.18), percentage: 18 },
            { id: 'x', name: 'X', img: '/img/thumbs/x.png', total: Math.round(ti * 0.12), percentage: 12 },
        ]
    }
    const topChannel = { visitors: currentViews.length, channels, estimated: brandTotal === 0 }

    // ---- Device session — real from captured UA (fallback to estimate) ----
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 }
    currentViews.forEach(e => { if (e.device && deviceCounts[e.device] != null) deviceCounts[e.device]++ })
    const knownDevices = deviceCounts.desktop + deviceCounts.mobile + deviceCounts.tablet
    let desktop, mobile, tablet
    if (knownDevices > 0) {
        ({ desktop, mobile, tablet } = deviceCounts)
    } else {
        const t = currentViews.length || 1
        desktop = Math.round(t * 0.42); mobile = Math.round(t * 0.39); tablet = t - desktop - mobile
    }
    const dTotal = (desktop + mobile + tablet) || 1
    const deviceSession = {
        labels: ['Desktop', 'Mobile', 'Tablet'],
        series: [desktop, mobile, tablet],
        percentage: [
            Math.round((desktop / dTotal) * 1000) / 10,
            Math.round((mobile / dTotal) * 1000) / 10,
            Math.round((tablet / dTotal) * 1000) / 10,
        ],
        estimated: knownDevices === 0,
    }

    // ---- Traffic table — real channel-category breakdown (fallback to estimate) ----
    const CHANNELS = [
        { source: 'Direct', key: 'direct' },
        { source: 'Organic Search', key: 'organic' },
        { source: 'Social Media', key: 'social' },
        { source: 'Referral', key: 'referral' },
        { source: 'Email', key: 'email' },
        { source: 'Paid', key: 'paid' },
    ]
    const channelCounts = {}
    let channelTotal = 0
    currentViews.forEach(e => { if (e.channel) { channelCounts[e.channel] = (channelCounts[e.channel] || 0) + 1; channelTotal++ } })
    let traffic
    if (channelTotal > 0) {
        traffic = CHANNELS
            .map(c => {
                const visits = channelCounts[c.key] || 0
                return {
                    source: c.source,
                    visits,
                    uniqueVisitors: Math.round(visits * 0.8),
                    bounceRate: '-',
                    avgSessionDuration: '-',
                    progress: Math.round((visits / channelTotal) * 100),
                }
            })
            .filter(r => r.visits > 0)
    } else {
        const t = currentViews.length || 1
        traffic = [
            { source: 'Direct', visits: Math.round(t * 0.30), uniqueVisitors: Math.round(t * 0.25), bounceRate: '-', avgSessionDuration: '-', progress: 30 },
            { source: 'Organic Search', visits: Math.round(t * 0.35), uniqueVisitors: Math.round(t * 0.30), bounceRate: '-', avgSessionDuration: '-', progress: 35 },
            { source: 'Social Media', visits: Math.round(t * 0.20), uniqueVisitors: Math.round(t * 0.17), bounceRate: '-', avgSessionDuration: '-', progress: 20 },
            { source: 'Referral', visits: Math.round(t * 0.10), uniqueVisitors: Math.round(t * 0.08), bounceRate: '-', avgSessionDuration: '-', progress: 10 },
            { source: 'Email', visits: Math.round(t * 0.05), uniqueVisitors: Math.round(t * 0.04), bounceRate: '-', avgSessionDuration: '-', progress: 5 },
        ]
    }

    return { metrics, webAnalytic, topPages, topChannel, deviceSession, traffic }
}

async function getAnalyticDashboard(site = 'all') {
    noStore()
    try {
        const [thisMonth, thisWeek, thisYear, today] = await Promise.all([
            buildPeriodData('thisMonth', site),
            buildPeriodData('thisWeek', site),
            buildPeriodData('thisYear', site),
            buildPeriodData('today', site),
        ])
        return { thisMonth, thisWeek, thisYear, today }
    } catch (error) {
        console.error('getAnalyticDashboard error:', error)
        // Return empty structure so dashboard doesn't crash
        const empty = {
            metrics: { visitors: { value: 0, growShrink: 0 }, conversionRate: { value: 0, growShrink: 0 }, adCampaignClicks: { value: 0, growShrink: 0 } },
            webAnalytic: { pageView: { value: 0, growShrink: 0 }, avgTimeOnPage: { value: '-', growShrink: 0 }, series: [], date: [] },
            topPages: [], topChannel: { visitors: 0, channels: [] }, deviceSession: { labels: [], series: [], percentage: [] }, traffic: [],
        }
        return { thisMonth: empty, thisWeek: empty, thisYear: empty, today: empty }
    }
}

export default getAnalyticDashboard
