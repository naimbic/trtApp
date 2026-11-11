import prisma from '@/lib/prisma'
import { readSettings } from '@/lib/crm/appSettings'
import { publicBase } from '@/lib/crm/shortLinks'
import { newToken, trackedHtml, countsAsHuman, TOKEN_RE, validSign, webUrl } from '@/lib/crm/mailTrackCalc'

const secret = () => process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
export const trackingOn = async () => (await readSettings(['mail_tracking'])).on('mail_tracking')

/** The mail ready to send with tracking (when it is on): { html, token } — the token is stored on the mail once it left. */
export async function withTracking({ body, signature = '' }) {
    if (!(await trackingOn()) || !secret()) return { html: `${body}${signature}`, token: null }
    const token = newToken()
    return { html: trackedHtml({ body, signature, base: publicBase(), token, secret: secret() }), token }
}

/** The first open / click of a mail tells the sender, and the team of a lead (in the bell and on the phone/Telegram when they use them). */
async function tell(m, kind) {
    try {
        const ids = new Set([m.addedFrom].filter(Boolean))
        if (m.leadId) { const l = await prisma.crmLead.findUnique({ where: { id: m.leadId }, select: { assigned: true, assignedIds: true, name: true } }); for (const i of [l?.assigned, ...(l?.assignedIds || [])]) if (i) ids.add(i) }
        const link = m.leadId ? `/crm/leads/${m.leadId}?tab=mails` : `/crm/customers/${m.clientId}?tab=mails`
        let subject = m.subject || ''
        if (m.clientId && !m.leadId) subject = `${(await prisma.crmClient.findUnique({ where: { id: m.clientId }, select: { company: true } }).catch(() => null))?.company || ''} · ${subject}`.trim()
        const { notifyNotice } = await import('@/lib/crm/notifyMail')
        const staff = await prisma.crmStaff.findMany({ where: { id: { in: [...ids] }, active: true }, select: { id: true } })
        for (const s of staff) {
            await prisma.crmNotification.create({ data: { toUserId: s.id, fromFullName: null, description: `${kind === 'click' ? '🔗' : '👁'} ${m.subject || ''}`.slice(0, 160), link, additionalData: kind === 'click' ? 'mail_clicked' : 'mail_opened', isRead: false } })
            notifyNotice(s.id, { kind: 'lead', headlineKey: kind === 'click' ? 'mailClicked' : 'mailOpened', vars: {}, link, title: subject, note: '' })
        }
    } catch (e) { console.error('[mail tracking]', e.message) }
}

const load = async (token) => (TOKEN_RE.test(String(token || '')) ? prisma.crmLeadMail.findFirst({ where: { trackToken: token, direction: 'out' } }) : null)

/** The picture was asked for. A hit right after sending (the recipient's server) is not a person. */
export async function recordOpen(token) {
    const m = await load(token)
    if (!m || !countsAsHuman(m.date)) return
    const now = new Date()
    const first = await prisma.crmLeadMail.updateMany({ where: { id: m.id, OR: [{ firstOpenAt: null }, { firstOpenAt: { isSet: false } }] }, data: { firstOpenAt: now, lastOpenAt: now, openCount: 1 } })
    if (first.count) return tell(m, 'open')
    await prisma.crmLeadMail.update({ where: { id: m.id }, data: { lastOpenAt: now, openCount: (m.openCount || 0) + 1 } })
}

/** A link was clicked: returns where to send the visitor (only a link that was really in the mail), or null. */
export async function recordClick(token, url, sig) {
    if (!webUrl(url) || !validSign(token, url, sig, secret())) return null
    const m = await load(token)
    if (!m) return url // the mail is gone: the link still works
    if (countsAsHuman(m.date, new Date(), 5000)) { // a person clicks later than a security scanner
        const now = new Date()
        const first = await prisma.crmLeadMail.updateMany({ where: { id: m.id, OR: [{ firstClickAt: null }, { firstClickAt: { isSet: false } }] }, data: { firstClickAt: now, lastClickAt: now, clickCount: 1 } })
        if (first.count) tell(m, 'click')
        else await prisma.crmLeadMail.update({ where: { id: m.id }, data: { lastClickAt: now, clickCount: (m.clickCount || 0) + 1 } })
    }
    return url
}
