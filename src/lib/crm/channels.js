import prisma from '@/lib/prisma'

/**
 * Notifications by Telegram and WhatsApp, next to email. Settings → WhatsApp & Telegram holds the accounts; each team member and each
 * client contact has a chat id / number and a switch. Every email template that is sent also goes out as a short message (the subject and
 * the link of the document) to the person's channels that are switched on.
 */
const KEYS = ['telegram_enabled', 'telegram_bot_token', 'whatsapp_enabled', 'whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_template', 'whatsapp_template_lang']
async function settings() {
    const rows = await prisma.crmOption.findMany({ where: { name: { in: KEYS } }, select: { name: true, value: true } })
    const o = Object.fromEntries(rows.map((r) => [r.name, r.value]))
    return { telegram: o.telegram_enabled === '1' && !!o.telegram_bot_token, token: o.telegram_bot_token || '', whatsapp: o.whatsapp_enabled === '1' && !!o.whatsapp_phone_number_id && !!o.whatsapp_access_token, phoneId: o.whatsapp_phone_number_id || '', waToken: o.whatsapp_access_token || '', template: o.whatsapp_template || '', lang: o.whatsapp_template_lang || 'en' }
}

const post = async (url, body, headers = {}) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, json }
}

export async function sendTelegram(chatId, text, s) {
    const c = s || (await settings())
    if (!c.telegram) return { sent: false, error: 'Telegram is not set up (Settings → WhatsApp & Telegram)' }
    const r = await post(`https://api.telegram.org/bot${c.token}/sendMessage`, { chat_id: String(chatId).trim(), text: String(text).slice(0, 3900), disable_web_page_preview: false })
    return r.ok && r.json.ok ? { sent: true } : { sent: false, error: r.json.description || 'Telegram refused the message' }
}

/** WhatsApp Cloud API: a template message when a template name is set (needed outside the 24 hour window), else a plain text. */
export async function sendWhatsapp(number, text, s) {
    const c = s || (await settings())
    if (!c.whatsapp) return { sent: false, error: 'WhatsApp is not set up (Settings → WhatsApp & Telegram)' }
    const to = String(number).replace(/[^0-9]/g, '')
    if (!to) return { sent: false, error: 'No WhatsApp number' }
    const message = c.template
        ? { type: 'template', template: { name: c.template, language: { code: c.lang }, components: [{ type: 'body', parameters: [{ type: 'text', text: String(text).replace(/\s*\n+\s*/g, ' · ').slice(0, 900) }] }] } }
        : { type: 'text', text: { body: String(text).slice(0, 3900), preview_url: true } }
    const r = await post(`https://graph.facebook.com/v20.0/${c.phoneId}/messages`, { messaging_product: 'whatsapp', to, ...message }, { Authorization: `Bearer ${c.waToken}` })
    return r.ok ? { sent: true } : { sent: false, error: r.json?.error?.message || 'WhatsApp refused the message' }
}

const linkOf = (data = {}) => {
    const pref = ['invoice_link', 'estimate_link', 'proposal_link', 'contract_link', 'ticket_url', 'project_link', 'task_link', 'client_area_link', 'set_password_url', 'reset_password_url']
    for (const k of pref) if (/^https?:/.test(data[k] || '')) return data[k]
    const any = Object.entries(data).find(([k, v]) => /_(link|url)$/.test(k) && /^https?:/.test(String(v || '')))
    return any ? any[1] : ''
}

/** Sends the message to the channels of the person who owns this email address (a client contact or a team member). */
export async function notifyChannels({ email, subject, data, relType, relId }) {
    try {
        if (!email || !subject) return
        const c = await settings()
        if (!c.telegram && !c.whatsapp) return
        const mail = String(email).trim()
        const who = (await prisma.crmContact.findFirst({ where: { email: { equals: mail, mode: 'insensitive' }, active: true } })) || (await prisma.crmStaff.findFirst({ where: { email: { equals: mail, mode: 'insensitive' } } }))
        if (!who) return
        const text = [subject, linkOf(data)].filter(Boolean).join('\n')
        const log = (to, r) => prisma.crmMailLog.create({ data: { to, subject, template: 'channel', relType: relType || null, relId: relId || undefined, status: r.sent ? 'sent' : 'failed', error: r.error || null } }).catch(() => {})
        if (c.telegram && who.notifyTelegram && who.telegramChatId) log(`telegram:${who.telegramChatId}`, await sendTelegram(who.telegramChatId, text, c))
        const wa = who.whatsappNumber || who.whatsapp // a contact has whatsappNumber, a team member has the WhatsApp number of the profile
        if (c.whatsapp && who.notifyWhatsapp && wa) log(`whatsapp:${wa}`, await sendWhatsapp(wa, text, c))
    } catch { /* a failed message must never break the email or the action behind it */ }
}

// emails a person needs to sign in or recover access are never switched off by a notification preference
const ESSENTIAL = /password|reset|verif|invite|two[-_ ]?factor|otp|confirm|activation|welcome|portal/i

/** False when the person behind this address chose not to receive automatic emails (Profile → Notifications). */
export async function emailAllowed(email, slug) {
    try {
        if (!email || ESSENTIAL.test(String(slug || ''))) return true
        const mail = String(email).trim()
        const who = (await prisma.crmContact.findFirst({ where: { email: { equals: mail, mode: 'insensitive' }, active: true }, select: { notifyEmail: true } })) || (await prisma.crmStaff.findFirst({ where: { email: { equals: mail, mode: 'insensitive' } }, select: { notifyEmail: true } }))
        return who?.notifyEmail !== false
    } catch { return true }
}
