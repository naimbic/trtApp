import prisma from '@/lib/prisma'
import { windowOpen } from '@/lib/crm/notifyHoursApi'

const DIGEST_FROM = 4 // more than this many waiting for one person: one message instead of a burst
const MAX_AGE = 2 * 86400000 // what is older than two days is no longer news

/** Keeps a push or a chat-app message for when the notification hours open. */
export async function enqueueNotice(staffId, kind, payload) {
    if (!staffId) return
    await prisma.crmNoticeQueue.create({ data: { staffId: String(staffId), kind, payload } }).catch(() => {})
}

/** Sends what waited, once the notification hours are open: one by one, or one digest per person when there are many. Returns lines for the cron report. */
export async function flushNotices({ dry = false } = {}) {
    const lines = []
    const w = await windowOpen()
    if (!w.open) return lines
    const rows = await prisma.crmNoticeQueue.findMany({ orderBy: { createdAt: 'asc' }, take: 500 })
    if (!rows.length) return lines
    const { pushToStaffNow } = await import('@/lib/crm/push')
    const { notifyStaffChannelsNow } = await import('@/lib/crm/channels')
    const { publicBase } = await import('@/lib/crm/shortLinks')
    const by = new Map()
    for (const r of rows) { const k = `${r.staffId}|${r.kind}`; if (!by.has(k)) by.set(k, []); by.get(k).push(r) }
    let sent = 0
    for (const list of by.values()) {
        const fresh = list.filter((r) => +new Date(r.createdAt) > Date.now() - MAX_AGE)
        const { staffId, kind } = list[0]
        if (dry) { lines.push(`[preview] ${fresh.length} ${kind} notification(s) waiting would be sent`); continue }
        if (fresh.length > DIGEST_FROM) {
            const text = `You have ${fresh.length} notifications waiting`
            if (kind === 'push') await pushToStaffNow(staffId, { title: 'trtCRM', body: text, url: '/crm/notifications', tag: 'digest' })
            else await notifyStaffChannelsNow(staffId, `${text}: ${publicBase()}/crm/notifications`)
            sent++
        } else {
            for (const r of fresh) { if (kind === 'push') await pushToStaffNow(staffId, r.payload || {}); else await notifyStaffChannelsNow(staffId, String(r.payload?.text || '')); sent++ }
        }
        await prisma.crmNoticeQueue.deleteMany({ where: { id: { in: list.map((r) => r.id) } } })
    }
    if (sent) lines.push(`${sent} notification(s) that waited for the notification hours were sent`)
    return lines
}
