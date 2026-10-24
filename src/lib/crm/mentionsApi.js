// @mentions and #tags typed in any comment, note, reply or chat message: the people and tags to suggest, and the notification a mentioned
// person gets. Any signed-in team member may mention a colleague.
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'

const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nameOf = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'

/** The colleagues and tags to suggest. */
export async function mentionDirectory() {
    await requirePermission(null)
    const [staff, tags] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true }, take: 500 }),
        prisma.crmTag.findMany({ orderBy: { name: 'asc' }, select: { name: true }, take: 500 }),
    ])
    return {
        staff: staff.map((s) => ({ id: s.id, name: nameOf(s), email: s.email || '' })).sort((a, b) => a.name.localeCompare(b.name)),
        tags: [...new Set(tags.map((t) => t.name).filter(Boolean))],
    }
}

/** Tells the mentioned people. Same person + same page + same words within 10 minutes is told once. */
export async function notifyMentions({ staffIds, text, url }) {
    const session = await requirePermission(null)
    const me = await getStaffId(session)
    const ids = [...new Set((staffIds || []).map(oid).filter(Boolean))].filter((i) => i !== me).slice(0, 20)
    if (!ids.length) return { notified: 0 }
    const valid = await prisma.crmStaff.findMany({ where: { id: { in: ids }, active: true }, select: { id: true } })
    const excerpt = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 160)
    const link = String(url || '').startsWith('/') ? String(url).slice(0, 300) : null
    let n = 0
    for (const s of valid) {
        const dup = await prisma.crmNotification.findFirst({ where: { toUserId: s.id, additionalData: 'mention', link, description: excerpt, createdAt: { gte: new Date(Date.now() - 600000) } }, select: { id: true } })
        if (dup) continue
        await prisma.crmNotification.create({ data: { toUserId: s.id, fromUserId: me, fromFullName: session.user.name || null, description: excerpt, link, additionalData: 'mention', isRead: false } })
        n++
    }
    return { notified: n }
}
