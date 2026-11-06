import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export const requestIp = (request) => (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').split(',')[0].trim() || null

/**
 * Is the person who opens this public page one of us? A signed-in team member (the session cookie comes with the request), or an address a team member
 * used lately (the CRM remembers it while they work: this also catches a private window at the office or at home). Off in Settings → Billing.
 */
export async function isTeamViewer(ip) {
    const off = await prisma.crmOption.findUnique({ where: { name: 'ignore_team_views' } }).catch(() => null)
    if (off?.value === '0') return false
    try { const s = await auth(); if (s?.user?.id && (await prisma.crmStaff.count({ where: { userId: s.user.id } }))) return true } catch { /* no session */ }
    if (!ip) return false
    return (await prisma.crmStaff.count({ where: { lastIp: ip, active: true, lastActivity: { gte: new Date(Date.now() - 45 * 86400000) } } })) > 0
}

/**
 * Remember that a client opened a public document page (Perfex "views_tracking").
 * Same address opening the same document again within 30 minutes counts once. Never throws.
 */
export async function trackView(relType, relId, request) {
    try {
        if (!/^[a-f0-9]{24}$/i.test(String(relId || ''))) return
        const viewIp = requestIp(request)
        if (await isTeamViewer(viewIp)) return // we looking at our own proposal is not the client seeing it
        const recent = await prisma.crmViewTracking.findFirst({ where: { relType, relId, viewIp, createdAt: { gte: new Date(Date.now() - 30 * 60000) } }, select: { id: true } })
        if (!recent) await prisma.crmViewTracking.create({ data: { relType, relId, viewIp } })
    } catch {
        /* tracking must never break the page */
    }
}

/** The addresses team members worked from lately (empty when the setting is off): views from them are not shown as a client's. */
export async function teamIps() {
    const off = await prisma.crmOption.findUnique({ where: { name: 'ignore_team_views' } }).catch(() => null)
    if (off?.value === '0') return new Set()
    const rows = await prisma.crmStaff.findMany({ where: { active: true, lastIp: { not: null }, lastActivity: { gte: new Date(Date.now() - 45 * 86400000) } }, select: { lastIp: true } })
    return new Set(rows.map((r) => r.lastIp))
}
