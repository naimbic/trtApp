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
    if (r.ok && r.json.ok) return { sent: true }
    const d = String(r.json.description || '')
    // Telegram's own wording is short: say what to do
    const error = /chat not found/i.test(d) ? 'Telegram does not know this chat id. Open the company bot in Telegram, press Start, and use your own number (ask @userinfobot for it)'
        : /can't initiate|cannot initiate|bot was blocked|user is deactivated/i.test(d) ? 'The bot cannot write to you yet: open the company bot in Telegram and press Start (or unblock it)'
        : /unauthorized|not found/i.test(d) || r.json.error_code === 401 || r.json.error_code === 404 ? 'The bot token in Settings is not right: copy it again from @BotFather'
        : d || 'Telegram refused the message'
    return { sent: false, error }
}

/** A notification of the bell (a mention, a comment, a checklist step given to you) also goes to the person's Telegram / WhatsApp when switched on in their profile. */
export async function notifyStaffChannels(staffId, text) {
    try {
        if (!staffId || !text) return
        const c = await settings()
        if (!c.telegram && !c.whatsapp) return
        const who = await prisma.crmStaff.findUnique({ where: { id: staffId } })
        if (!who) return
        const log = (to, r) => prisma.crmMailLog.create({ data: { to, subject: String(text).slice(0, 200), template: 'channel', status: r.sent ? 'sent' : 'failed', error: r.error || null } }).catch(() => {})
        if (c.telegram && who.notifyTelegram && who.telegramChatId) log(`telegram:${who.telegramChatId}`, await sendTelegram(who.telegramChatId, text, c))
        if (c.whatsapp && who.notifyWhatsapp && who.whatsapp) log(`whatsapp:${who.whatsapp}`, await sendWhatsapp(who.whatsapp, text, c))
    } catch { /* never breaks the action behind it */ }
}

/** "Send me a test": a message to the channel saved in the person's own profile. */
export async function testOwnChannel(staffId, channel) {
    const who = await prisma.crmStaff.findUnique({ where: { id: staffId } })
    if (!who) return { sent: false, error: 'No staff profile' }
    const text = 'trtCRM: test message. Your notifications arrive here.'
    if (channel === 'whatsapp') return who.whatsapp ? sendWhatsapp(who.whatsapp, text) : { sent: false, error: 'Add your WhatsApp number in the Profile tab first' }
    return who.telegramChatId ? sendTelegram(who.telegramChatId, text) : { sent: false, error: 'Enter your Telegram chat id first' }
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
