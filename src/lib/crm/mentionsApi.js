// @mentions and #tags typed in any comment, note, reply or chat message: the people and tags to suggest, and the notification a mentioned
// person gets. Any signed-in team member may mention a colleague.
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { plainText } from '@/lib/crm/richText'
import { notifyStaffChannels } from '@/lib/crm/channels'
import { publicBase } from '@/lib/crm/shortLinks'

const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nameOf = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'

/** The colleagues and tags to suggest. */
export async function mentionDirectory() {
    const session = await requirePermission(null)
    const [me, staff, tags] = await Promise.all([
        getStaffId(session),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true }, take: 500 }),
        prisma.crmTag.findMany({ orderBy: { name: 'asc' }, select: { name: true }, take: 500 }),
    ])
    return {
        me,
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
        notifyStaffChannels(s.id, `${session.user.name || 'A colleague'} mentioned you: ${excerpt}${link ? `\n${publicBase()}${link}` : ''}`)
        n++
    }
    return { notified: n }
}

/**
 * A new comment or note on a record: the people it names with @ are told they were mentioned, and the people who follow the record
 * (assignees, followers, whoever created it) that someone commented. Nobody is told about their own words; nobody twice.
 * `by` = { staffId, name }, `recipients` = staff ids following the record, `link` = the page, `subject` = what it was written on.
 */
export async function notifyComment({ by, text, link, subject, recipients = [] }) {
    const { mentionedIds } = await import('@/lib/crm/mentionsCalc')
    const staff = await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true } })
    const plain = plainText(text)
    const named = mentionedIds(plain, staff.map((s) => ({ id: s.id, name: nameOf(s) }))).filter((i) => i !== by.staffId)
    const follow = [...new Set(recipients.filter(Boolean))].filter((i) => i !== by.staffId && !named.includes(i) && staff.some((s) => s.id === i))
    const excerpt = plain.replace(/\s+/g, ' ').slice(0, 160) || (/<img\b/i.test(String(text)) ? '🖼' : '')
    const since = new Date(Date.now() - 600000)
    const make = async (to, tag) => {
        const dup = await prisma.crmNotification.findFirst({ where: { toUserId: to, additionalData: tag, link, description: excerpt, createdAt: { gte: since } }, select: { id: true } })
        if (!dup) {
            await prisma.crmNotification.create({ data: { toUserId: to, fromUserId: by.staffId, fromFullName: by.name || null, description: excerpt, link, additionalData: tag, isRead: false } })
            notifyStaffChannels(to, `${by.name || 'A colleague'} ${tag === 'mention' ? 'mentioned you' : `commented on “${String(subject || '')}”`}: ${excerpt}${link ? `\n${publicBase()}${link}` : ''}`)
        }
    }
    for (const to of named) await make(to, 'mention')
    for (const to of follow) await make(to, `comment|${String(subject || '').slice(0, 120)}`)
    return { mentioned: named.length, followers: follow.length }
}

/** A description saved with new @mentions: the people named now and not before are told. `prev` = the text as it was. */
export async function notifyNewMentions({ by, text, prev, link, subject }) {
    try {
        const { mentionedIds } = await import('@/lib/crm/mentionsCalc')
        const staff = (await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true } })).map((s) => ({ id: s.id, name: nameOf(s) }))
        const before = new Set(mentionedIds(plainText(prev), staff))
        const fresh = mentionedIds(plainText(text), staff).filter((i) => !before.has(i) && i !== by.staffId)
        const excerpt = plainText(text).replace(/\s+/g, ' ').slice(0, 160)
        for (const to of fresh) {
            const dup = await prisma.crmNotification.findFirst({ where: { toUserId: to, additionalData: 'mention', link, description: excerpt, createdAt: { gte: new Date(Date.now() - 600000) } }, select: { id: true } })
            if (!dup) {
                await prisma.crmNotification.create({ data: { toUserId: to, fromUserId: by.staffId, fromFullName: by.name || null, description: `${subject ? `${subject}: ` : ''}${excerpt}`.slice(0, 200), link, additionalData: 'mention', isRead: false } })
                notifyStaffChannels(to, `${by.name || 'A colleague'} mentioned you${subject ? ` in “${subject}”` : ''}: ${excerpt}${link ? `\n${publicBase()}${link}` : ''}`)
            }
        }
        return fresh.length
    } catch (e) { console.error('[mention notify]', e.message); return 0 }
}
