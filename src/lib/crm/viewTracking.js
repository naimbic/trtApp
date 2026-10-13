import prisma from '@/lib/prisma'

export const requestIp = (request) => (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').split(',')[0].trim() || null

/**
 * Remember that a client opened a public document page (Perfex "views_tracking").
 * Same address opening the same document again within 30 minutes counts once. Never throws.
 */
export async function trackView(relType, relId, request) {
    try {
        if (!/^[a-f0-9]{24}$/i.test(String(relId || ''))) return
        const viewIp = requestIp(request)
        const recent = await prisma.crmViewTracking.findFirst({ where: { relType, relId, viewIp, createdAt: { gte: new Date(Date.now() - 30 * 60000) } }, select: { id: true } })
        if (!recent) await prisma.crmViewTracking.create({ data: { relType, relId, viewIp } })
    } catch {
        /* tracking must never break the page */
    }
}
