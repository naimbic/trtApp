import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function getDateRange(period) {
    const now = new Date()
    let start
    switch (period) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
        case 'week':
            start = new Date(now)
            start.setDate(now.getDate() - now.getDay())
            start.setHours(0, 0, 0, 0)
            break
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1)
            break
        case 'quarter':
            start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
            break
        case 'year':
            start = new Date(now.getFullYear(), 0, 1)
            break
        default:
            return null
    }
    return start
}

function getPreviousPeriodRange(period) {
    const now = new Date()
    let start, end
    switch (period) {
        case 'today':
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            start = new Date(end)
            start.setDate(start.getDate() - 1)
            break
        case 'week':
            end = new Date(now)
            end.setDate(now.getDate() - now.getDay())
            end.setHours(0, 0, 0, 0)
            start = new Date(end)
            start.setDate(start.getDate() - 7)
            break
        case 'month':
            end = new Date(now.getFullYear(), now.getMonth(), 1)
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            break
        case 'quarter': {
            const qStart = Math.floor(now.getMonth() / 3) * 3
            end = new Date(now.getFullYear(), qStart, 1)
            start = new Date(now.getFullYear(), qStart - 3, 1)
            break
        }
        case 'year':
            end = new Date(now.getFullYear(), 0, 1)
            start = new Date(now.getFullYear() - 1, 0, 1)
            break
        default:
            return null
    }
    return { start, end }
}

function getChartMonths(period) {
    const now = new Date()
    switch (period) {
        case 'today':
        case 'week':
            return Array.from({ length: 7 }, (_, i) => {
                const d = new Date(now)
                d.setDate(now.getDate() - 6 + i)
                return { label: d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' }), start: new Date(d.getFullYear(), d.getMonth(), d.getDate()), end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) }
            })
        case 'month':
            return Array.from({ length: 4 }, (_, i) => {
                const start = new Date(now.getFullYear(), now.getMonth(), 1 + i * 7)
                const end = new Date(start)
                end.setDate(start.getDate() + 7)
                return { label: `Week ${i + 1}`, start, end }
            })
        case 'quarter': {
            const qStart = Math.floor(now.getMonth() / 3) * 3
            return Array.from({ length: 3 }, (_, i) => {
                const d = new Date(now.getFullYear(), qStart + i, 1)
                return { label: d.toLocaleDateString('en', { month: 'short' }), start: d, end: new Date(now.getFullYear(), qStart + i + 1, 1) }
            })
        }
        default:
            return Array.from({ length: 12 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
                return { label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }), start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) }
            })
    }
}

function calcStats(invoices) {
    const paid = invoices.filter(i => i.status === 'paid')
    const unpaid = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    const overdue = invoices.filter(i => i.status === 'overdue')
    return {
        totalReceived: paid.reduce((s, i) => s + (i.paymentAmount || i.total || 0), 0),
        totalOutstanding: unpaid.reduce((s, i) => s + (i.total || 0), 0),
        totalOverdue: overdue.reduce((s, i) => s + (i.total || 0), 0),
        paidCount: paid.length,
        unpaidCount: unpaid.length,
        overdueCount: overdue.length,
        totalInvoices: invoices.length,
    }
}

function calcChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
}

export async function GET(request) {
    const denied = await needSession()
    if (denied) return denied
    try {
        const period = request.nextUrl.searchParams.get('period') || ''
        const dateStart = getDateRange(period)

        const where = { type: 'invoice' }
        if (dateStart) where.createdAt = { gte: dateStart }

        const invoices = await prisma.invoice.findMany({
            where,
            select: { status: true, total: true, paymentAmount: true, createdAt: true, customerId: true },
        })

        const current = calcStats(invoices)

        // Previous period comparison
        const prevRange = getPreviousPeriodRange(period)
        let comparison = null
        if (prevRange) {
            const prevInvoices = await prisma.invoice.findMany({
                where: { type: 'invoice', createdAt: { gte: prevRange.start, lt: prevRange.end } },
                select: { status: true, total: true, paymentAmount: true },
            })
            const prev = calcStats(prevInvoices)
            comparison = {
                received: calcChange(current.totalReceived, prev.totalReceived),
                outstanding: calcChange(current.totalOutstanding, prev.totalOutstanding),
                overdue: calcChange(current.totalOverdue, prev.totalOverdue),
                invoices: calcChange(current.totalInvoices, prev.totalInvoices),
            }
        }

        // Chart data
        const buckets = getChartMonths(period)
        const months = buckets.map(b => b.label)

        const allChartInvoices = await prisma.invoice.findMany({
            where: { type: 'invoice', createdAt: { gte: buckets[0].start, lt: buckets[buckets.length - 1].end } },
            select: { status: true, total: true, paymentAmount: true, createdAt: true },
        })

        const paidData = []
        const outstandingData = []
        const overdueData = []
        for (const bucket of buckets) {
            const inBucket = allChartInvoices.filter(inv => {
                const c = new Date(inv.createdAt)
                return c >= bucket.start && c < bucket.end
            })
            paidData.push(inBucket.filter(x => x.status === 'paid').reduce((s, x) => s + (x.paymentAmount || x.total || 0), 0))
            outstandingData.push(inBucket.filter(x => x.status !== 'paid' && x.status !== 'cancelled').reduce((s, x) => s + (x.total || 0), 0))
            overdueData.push(inBucket.filter(x => x.status === 'overdue').reduce((s, x) => s + (x.total || 0), 0))
        }

        // Top countries
        const customerIds = [...new Set(invoices.filter(i => i.customerId).map(i => i.customerId))]
        const customers = customerIds.length
            ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, country: true } })
            : []
        const customerCountryMap = Object.fromEntries(customers.map(c => [c.id, c.country]))
        const countryTotals = {}
        invoices.forEach(inv => {
            const country = customerCountryMap[inv.customerId] || 'Unknown'
            if (!countryTotals[country]) countryTotals[country] = { total: 0, count: 0 }
            countryTotals[country].total += inv.total || 0
            countryTotals[country].count += 1
        })
        const grandTotal = invoices.reduce((s, i) => s + (i.total || 0), 0)
        const topCountries = Object.entries(countryTotals)
            .map(([name, d]) => ({ name, value: grandTotal > 0 ? Math.round((d.total / grandTotal) * 100) : 0, total: d.total, count: d.count }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6)

        return NextResponse.json({
            ...current,
            comparison,
            topCountries,
            chart: {
                months,
                paid: { name: 'Paid', data: paidData },
                outstanding: { name: 'Outstanding', data: outstandingData },
                overdue: { name: 'Overdue', data: overdueData },
            },
        })
    } catch (error) {
        console.error('GET /api/invoices/stats error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
