// Alerts to the administrators when something breaks (a failed backup, a failing cron job, a burst of server errors, a late backup):
// the bell, an email, and Telegram / WhatsApp when they use them. The same alert is sent once per hour at most.
import prisma from '@/lib/prisma'
import { getOptions, setOptions, deliver, escapeHtml } from '@/lib/crm/mailer'
import { notifyNotice } from '@/lib/crm/notifyMail'

const HOUR = 3600000

/** Tells every active administrator. Never throws: an alert must not break what it reports. */
export async function alertAdmins({ key, title, text, everyMinutes = 60 }) {
    try {
        const o = await getOptions(['alerts_enabled', `alert_last_${key}`, 'companyname'])
        if (o('alerts_enabled', '1') === '0') return false
        const last = Number(o(`alert_last_${key}`)) || 0
        if (Date.now() - last < Math.max(5, everyMinutes) * 60000) return false
        await setOptions({ [`alert_last_${key}`]: Date.now() })
        const admins = await prisma.crmStaff.findMany({ where: { active: true, admin: true }, select: { id: true, email: true } })
        const body = String(text || '').slice(0, 600)
        const html = `<div style="font-family:system-ui,sans-serif;max-width:520px"><h3 style="margin:0 0 8px">${escapeHtml(title)}</h3><p style="white-space:pre-line;color:#444">${escapeHtml(body)}</p><p style="color:#888;font-size:12px">${escapeHtml(o('companyname') || 'trtCRM')} · automatic alert, sent once an hour at most. Switch alerts off in Settings → Cron job.</p></div>`
        for (const a of admins) {
            await prisma.crmNotification.create({ data: { toUserId: a.id, fromFullName: 'Alert', description: `${title}: ${body}`.slice(0, 200), link: '/crm/settings?group=cronjob', additionalData: 'alert', isRead: false } }).catch(() => {})
            if (a.email) await deliver({ to: a.email, subject: `⚠ ${title}`, html }).catch(() => {})
            notifyNotice(a.id, { kind: 'other', title, note: body, link: '/crm/settings?group=cronjob' })
        }
        return true
    } catch (e) { console.error('[alert]', e.message); return false }
}

// a burst of server errors: 5 within 10 minutes
const recent = []
export function noteServerError(message) {
    const now = Date.now()
    recent.push(now)
    while (recent.length && now - recent[0] > 10 * 60000) recent.shift()
    if (recent.length >= 5) alertAdmins({ key: 'errors', title: 'The CRM is returning server errors', text: `${recent.length} server errors in the last 10 minutes. The last one: ${String(message || '').slice(0, 200)}` })
}

/** The admin's view: when the alerts last went out. */
export async function lastAlerts() {
    const rows = await prisma.crmOption.findMany({ where: { name: { startsWith: 'alert_last_' } } })
    return rows.map((r) => ({ key: r.name.replace('alert_last_', ''), at: Number(r.value) || 0 })).sort((a, b) => b.at - a.at)
}
export { HOUR }
