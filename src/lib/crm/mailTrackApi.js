import prisma from '@/lib/prisma'
import { readSettings } from '@/lib/crm/appSettings'
import { publicBase } from '@/lib/crm/shortLinks'
import { newToken, trackedHtml, countsAsHuman, TOKEN_RE, validSign, webUrl } from '@/lib/crm/mailTrackCalc'

const secret = () => process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
export const trackingOn = async () => (await readSettings(['mail_tracking'])).on('mail_tracking')

/** The mail ready to send with tracking (when it is on): { html, token } — the token is stored on the mail once it left. */
export async function withTracking({ body, signature = '', only = null }) {
    if (!(await trackingOn()) || !secret()) return { html: `${body}${signature}`, token: null }
    const token = newToken()
    return { html: trackedHtml({ body, signature, base: publicBase(), token, secret: secret(), only }), token }
}

/** For the mails of invoices, proposals...: only the links to this CRM (the document link) are tracked, not the logo or the signature links. */
export const ownLinksOnly = () => { const base = publicBase(); return (u) => u.startsWith(`${base}/`) }

const DOC_PATH = { invoice: 'invoices', estimate: 'estimates', proposal: 'proposals', contract: 'contracts', purchase_order: 'purchase-orders' }

/** The first open / click of a mail tells the sender, and the team of a lead (in the bell and on the phone/Telegram when they use them). */
async function tell(m, kind, isLog = false) {
    try {
        const ids = new Set([m.addedFrom, m.staffId].filter(Boolean))
        let link, subject = m.subject || ''
        if (isLog) { link = DOC_PATH[m.relType] && m.relId ? `/crm/${DOC_PATH[m.relType]}/${m.relId}` : '/crm/mails?tab=log' }
        else {
            if (m.leadId) { const l = await prisma.crmLead.findUnique({ where: { id: m.leadId }, select: { assigned: true, assignedIds: true } }); for (const i of [l?.assigned, ...(l?.assignedIds || [])]) if (i) ids.add(i) }
            link = m.leadId ? `/crm/leads/${m.leadId}?tab=mails` : `/crm/customers/${m.clientId}?tab=mails`
            if (m.clientId && !m.leadId) subject = `${(await prisma.crmClient.findUnique({ where: { id: m.clientId }, select: { company: true } }).catch(() => null))?.company || ''} · ${subject}`.trim()
        }
        const { notifyNotice } = await import('@/lib/crm/notifyMail')
        const staff = await prisma.crmStaff.findMany({ where: { id: { in: [...ids] }, active: true }, select: { id: true } })
        for (const s of staff) {
            await prisma.crmNotification.create({ data: { toUserId: s.id, fromFullName: null, description: `${kind === 'click' ? '🔗' : '👁'} ${m.subject || ''}`.slice(0, 160), link, additionalData: kind === 'click' ? 'mail_clicked' : 'mail_opened', isRead: false } })
            notifyNotice(s.id, { kind: isLog ? undefined : 'lead', headlineKey: kind === 'click' ? 'mailClicked' : 'mailOpened', vars: {}, link, title: subject, note: '' })
        }
    } catch (e) { console.error('[mail tracking]', e.message) }
}

/** The tracked mail of a token: a mail of a lead / customer, or a row of the sent log (invoices, proposals...). */
async function load(token) {
    if (!TOKEN_RE.test(String(token || ''))) return null
    const a = await prisma.crmLeadMail.findFirst({ where: { trackToken: token, direction: 'out' } })
    if (a) return { row: a, model: 'crmLeadMail', sentAt: a.date, isLog: false }
    const b = await prisma.crmMailLog.findFirst({ where: { trackToken: token, status: 'sent' } })
    return b ? { row: b, model: 'crmMailLog', sentAt: b.createdAt, isLog: true } : null
}

/** The picture was asked for. A hit right after sending (the recipient's server) is not a person. */
export async function recordOpen(token) {
    const t = await load(token)
    if (!t || !countsAsHuman(t.sentAt)) return
    const m = t.row, now = new Date()
    const first = await prisma[t.model].updateMany({ where: { id: m.id, OR: [{ firstOpenAt: null }, { firstOpenAt: { isSet: false } }] }, data: { firstOpenAt: now, lastOpenAt: now, openCount: 1 } })
    if (first.count) return tell(m, 'open', t.isLog)
    await prisma[t.model].update({ where: { id: m.id }, data: { lastOpenAt: now, openCount: (m.openCount || 0) + 1 } })
}

/** A link was clicked: returns where to send the visitor (only a link that was really in the mail), or null. */
export async function recordClick(token, url, sig) {
    if (!webUrl(url) || !validSign(token, url, sig, secret())) return null
    const t = await load(token)
    if (!t) return url // the mail is gone: the link still works
    if (countsAsHuman(t.sentAt, new Date(), 5000)) { // a person clicks later than a security scanner
        const m = t.row, now = new Date()
        const first = await prisma[t.model].updateMany({ where: { id: m.id, OR: [{ firstClickAt: null }, { firstClickAt: { isSet: false } }] }, data: { firstClickAt: now, lastClickAt: now, clickCount: 1 } })
        if (first.count) tell(m, 'click', t.isLog)
        else await prisma[t.model].update({ where: { id: m.id }, data: { lastClickAt: now, clickCount: (m.clickCount || 0) + 1 } })
    }
    return url
}
