import prisma from '@/lib/prisma'
import { requirePortal } from '@/lib/portal/session'
import { vapid, pushEnabled, pushToContacts } from '@/lib/crm/push'
import { validSubscription } from '@/lib/crm/pushCalc'

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })

export async function portalPushStatus() {
    const s = await requirePortal()
    const [v, mine] = await Promise.all([vapid(), prisma.crmPushSubscription.findMany({ where: { contactId: s.contact.id }, select: { id: true, endpoint: true } })])
    return { enabled: await pushEnabled(), publicKey: v.publicKey, devices: mine }
}

export async function portalPushSubscribe(body = {}) {
    const s = await requirePortal()
    if (s.preview) throw httpError('This is a preview: nothing is saved', 403)
    const sub = body.subscription
    if (!validSubscription(sub)) throw httpError('This device sent an invalid subscription')
    const data = { p256dh: sub.keys.p256dh, auth: sub.keys.auth, contactId: s.contact.id, staffId: null, userAgent: String(body.userAgent || '').slice(0, 200) || null, failures: 0 }
    await prisma.crmPushSubscription.upsert({ where: { endpoint: sub.endpoint }, update: data, create: { endpoint: sub.endpoint, ...data } })
    return { success: true }
}

export async function portalPushUnsubscribe(endpoint) {
    const s = await requirePortal()
    await prisma.crmPushSubscription.deleteMany({ where: { endpoint: String(endpoint || ''), contactId: s.contact.id } })
    return { success: true }
}

export async function portalPushTest() {
    const s = await requirePortal()
    if (!(await pushEnabled())) throw httpError('Push notifications are switched off', 409)
    return { success: true, ...(await pushToContacts({ contactId: s.contact.id }, { title: s.client.company || 'trtCRM', body: 'Notifications work on this device.', url: '/portal', tag: 'test' })) }
}
