import webpush from 'web-push'
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { seal, open } from '@/lib/crm/ai/secret'
import { buildPayload, validSubscription, isGone } from '@/lib/crm/pushCalc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const KEY = 'push_vapid'
let cached = null

/** The server's push keys: made once, kept sealed in the settings (or taken from PUSH_VAPID_PUBLIC / PUSH_VAPID_PRIVATE). */
export async function vapid() {
    if (cached) return cached
    const subject = process.env.PUSH_SUBJECT || `mailto:${process.env.PUSH_CONTACT || 'admin@localhost.invalid'}`
    if (process.env.PUSH_VAPID_PUBLIC && process.env.PUSH_VAPID_PRIVATE) return (cached = { publicKey: process.env.PUSH_VAPID_PUBLIC, privateKey: process.env.PUSH_VAPID_PRIVATE, subject })
    const row = await prisma.crmOption.findUnique({ where: { name: KEY } })
    const stored = row?.value ? open(row.value) : null
    let keys = null
    try { keys = stored ? JSON.parse(stored) : null } catch { keys = null }
    if (!keys?.publicKey) {
        keys = webpush.generateVAPIDKeys()
        const value = seal(JSON.stringify(keys))
        await prisma.crmOption.upsert({ where: { name: KEY }, update: { value }, create: { name: KEY, value } })
    }
    return (cached = { ...keys, subject })
}

/** Settings → WhatsApp & Telegram → "Push notifications on phones" (on unless switched off). */
export async function pushEnabled() {
    const o = await prisma.crmOption.findUnique({ where: { name: 'push_notifications' } })
    return o?.value !== '0'
}

const send = async (rows, payload) => {
    if (!rows.length || !(await pushEnabled())) return { sent: 0, failed: 0 }
    const v = await vapid()
    const body = JSON.stringify(payload)
    let sent = 0, failed = 0
    await Promise.all(rows.map(async (r) => {
        try {
            await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, body, { vapidDetails: { subject: v.subject, publicKey: v.publicKey, privateKey: v.privateKey }, TTL: 3 * 3600, urgency: 'normal', timeout: 8000 })
            sent++
            prisma.crmPushSubscription.update({ where: { id: r.id }, data: { lastUsedAt: new Date(), failures: 0 } }).catch(() => {})
        } catch (e) {
            failed++
            if (isGone(e?.statusCode)) await prisma.crmPushSubscription.delete({ where: { id: r.id } }).catch(() => {})
            else prisma.crmPushSubscription.update({ where: { id: r.id }, data: { failures: { increment: 1 } } }).catch(() => {})
        }
    }))
    return { sent, failed }
}

/** Tells a team member on every device they registered. Never throws: a notification must not break what caused it. */
export async function pushToStaff(staffId, msg) {
    try {
        if (!staffId) return { sent: 0, failed: 0 }
        return await send(await prisma.crmPushSubscription.findMany({ where: { staffId: String(staffId) }, take: 10 }), buildPayload(msg))
    } catch (e) { console.error('[push]', e.message); return { sent: 0, failed: 0 } }
}

/** Tells the contacts of a client (or one contact) in the client area. */
export async function pushToContacts({ clientId = null, contactId = null }, msg) {
    try {
        const contacts = contactId ? [contactId] : (await prisma.crmContact.findMany({ where: { clientId, active: true }, select: { id: true } })).map((c) => c.id)
        if (!contacts.length) return { sent: 0, failed: 0 }
        return await send(await prisma.crmPushSubscription.findMany({ where: { contactId: { in: contacts } }, take: 30 }), buildPayload(msg))
    } catch (e) { console.error('[push]', e.message); return { sent: 0, failed: 0 } }
}

/* ---------------------------------------------------------------- the team member's own device */
async function me() {
    const session = await requirePermission(null)
    const staffId = await getStaffId(session)
    if (!staffId) throw fail('Push notifications need a team profile linked to your login', 403)
    return { staffId }
}

export async function pushStatus() {
    const { staffId } = await me()
    const [v, mine] = await Promise.all([vapid(), prisma.crmPushSubscription.findMany({ where: { staffId }, select: { id: true, endpoint: true, userAgent: true, createdAt: true, lastUsedAt: true } })])
    return { enabled: await pushEnabled(), publicKey: v.publicKey, devices: mine.map((d) => ({ id: d.id, endpoint: d.endpoint, userAgent: d.userAgent || '', createdAt: d.createdAt, lastUsedAt: d.lastUsedAt })) }
}

export async function pushSubscribe(body = {}) {
    const { staffId } = await me()
    const sub = body.subscription
    if (!validSubscription(sub)) throw fail('This device sent an invalid subscription')
    const data = { p256dh: sub.keys.p256dh, auth: sub.keys.auth, staffId, contactId: null, userAgent: String(body.userAgent || '').slice(0, 200) || null, failures: 0 }
    await prisma.crmPushSubscription.upsert({ where: { endpoint: sub.endpoint }, update: data, create: { endpoint: sub.endpoint, ...data } })
    return { success: true }
}

export async function pushUnsubscribe(endpoint) {
    const { staffId } = await me()
    await prisma.crmPushSubscription.deleteMany({ where: { endpoint: String(endpoint || ''), staffId } })
    return { success: true }
}

/** A test notification to all my devices. */
export async function pushTest() {
    const { staffId } = await me()
    if (!(await pushEnabled())) throw fail('Push notifications are switched off in Settings', 409)
    const r = await pushToStaff(staffId, { title: 'trtCRM', body: 'Notifications work on this device.', url: '/', tag: 'test' })
    return { success: true, ...r }
}
