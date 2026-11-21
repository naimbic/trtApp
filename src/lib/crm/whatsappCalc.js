// WhatsApp (Meta Cloud API): what Meta's error codes mean in plain words, the number format, the templates and the webhook. No network: tested on its own.
import crypto from 'node:crypto'
const DAY = 86400000

/** A clear sentence (what to do) for an error answered by the Cloud API; the original message when the code is not known. */
export function explainWhatsapp(err = {}) {
    const code = Number(err.code), sub = Number(err.error_subcode), msg = String(err.message || '')
    if (code === 190 || /access token|session has expired|OAuthException/i.test(msg) && code !== 100) return 'The WhatsApp access token is not valid or has expired. Create a permanent token (Meta Business Settings → System users → Generate token with the whatsapp_business_messaging permission) and paste it in Settings, or add the App ID and App Secret so the CRM renews it.'
    if (code === 131030) return 'This number is not in the list of recipients allowed for the Meta test number. Add it in Meta for Developers → WhatsApp → API setup → "To", or switch to a real business number.'
    if (code === 131047 || code === 131051 || /re-engage|24 hour/i.test(msg)) return 'WhatsApp only allows a free message within 24 hours of the person writing to you. Set the name of an approved template in Settings (Template name), or ask the person to send you a message first.'
    if (code === 132000 || code === 132001 || code === 132012 || /template/i.test(msg) && /exist|param|language|translation/i.test(msg)) return 'WhatsApp does not accept the template: check its name, its language code and that its body has exactly one variable ({{1}}) in Settings.'
    if (code === 131026 || /not a whatsapp user|undeliverable/i.test(msg)) return 'This number is not on WhatsApp, or it cannot receive the message. Check the number (with the country code).'
    const details = String(err.error_data?.details || err.error_user_msg || '')
    if (code === 100 && /recipient|"to"|\bto\b.*(not valid|invalid)|phone number.*(not valid|invalid)/i.test(`${details} ${msg}`) && !/phone.number.id|object with id/i.test(`${details} ${msg}`)) return 'WhatsApp does not accept this number. Write it with the country code and nothing else, for example +212 600 000 000 (no 0 in front of the local part).'
    if (code === 100 && /template|language|component|parameter.*(number|expected)|number of parameters/i.test(`${details} ${msg}`) && !/phone.number.id|object with id/i.test(`${details} ${msg}`)) return `WhatsApp does not accept the template as it is sent${details ? ` (“${details}”)` : ''}. Open Settings → WhatsApp, press “Check the WhatsApp connection”: it lists your approved templates, their language and how many variables they have.`
    if (code === 100 && /phone.number|nonexisting field|unsupported post request|object with id/i.test(`${details} ${msg}`) || sub === 33) return 'The Phone number ID is not right: copy it again from Meta for Developers → WhatsApp → API setup (it is not the phone number itself).'
    if (code === 131056 || code === 130429 || code === 80007) return 'WhatsApp is slowing the account down (too many messages too fast). Try again in a few minutes.'
    if (code === 131042 || code === 131031) return 'The WhatsApp Business account has a payment or account problem: open it in Meta Business Manager.'
    if (code === 100) return `WhatsApp says: invalid parameter${details ? ` (${details})` : ''}. Check the Phone number ID, the template name and its language, and the recipient number (with the country code).`
    return msg || 'WhatsApp refused the message'
}

/** What to do about a token that expires at `expiresAtSec` (0 / null = never): 'ok' | 'renew' (within 10 days, it can be renewed) | 'warn' (within 3 days or invalid and it cannot be renewed) | 'expired'. */
export function tokenAdvice({ valid = true, expiresAtSec = 0, canRenew = false, nowMs = Date.now() } = {}) {
    if (!valid) return canRenew ? 'renew' : 'expired'
    if (!expiresAtSec) return 'ok'
    const left = expiresAtSec * 1000 - nowMs
    if (left <= 0) return canRenew ? 'renew' : 'expired'
    if (left <= 10 * DAY) return canRenew ? 'renew' : left <= 3 * DAY ? 'warn' : 'ok'
    return 'ok'
}

/** { to } the digits WhatsApp wants (country code first, no +, no 00), or { error } when the number cannot be right. */
export function normalizeWhatsappNumber(raw) {
    let d = String(raw || '').replace(/[^0-9]/g, '')
    if (d.startsWith('00')) d = d.slice(2)
    else if (/^0[1-9]/.test(d) && !String(raw).trim().startsWith('+')) return { error: 'Write the number with the country code (for example +212 600 000 000), without the 0 in front.' }
    if (d.length < 8 || d.length > 15) return { error: 'This does not look like a phone number with its country code.' }
    return { to: d }
}

/** How many variables ({{1}}, {{2}}...) the body of a template has. */
export function templateVars(components = []) {
    const body = (components || []).find((c) => String(c.type).toUpperCase() === 'BODY')
    const found = new Set(String(body?.text || '').match(/\{\{\s*\d+\s*\}\}/g) || [])
    return found.size
}

/** What is wrong with the template named in Settings, given the list the account answered: null when it is fine. templates: [{ name, language, status, vars }] */
export function templateProblem(templates = [], name, lang) {
    if (!name) return null
    const same = templates.filter((t) => t.name === name)
    if (!same.length) return `No template called “${name}” in this WhatsApp Business account.${templates.length ? ` Approved ones: ${[...new Set(templates.filter((t) => t.status === 'APPROVED').map((t) => t.name))].slice(0, 6).join(', ') || 'none'}.` : ''}`
    const inLang = same.find((t) => String(t.language).toLowerCase() === String(lang || 'en').toLowerCase()) || same.find((t) => String(t.language).toLowerCase().split('_')[0] === String(lang || 'en').toLowerCase().split('_')[0])
    if (!inLang) return `The template “${name}” exists in ${same.map((t) => t.language).join(', ')} but not in “${lang || 'en'}”: change the Template language.`
    if (inLang.status !== 'APPROVED') return `The template “${name}” is ${String(inLang.status || 'not approved').toLowerCase()}: it can only be used once Meta approves it.`
    return null
}

/** True when X-Hub-Signature-256 is the HMAC of the raw body with the App Secret. */
export function validSignature(rawBody, header, secret) {
    if (!secret || !header) return false
    const want = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`
    const a = Buffer.from(String(header)), b = Buffer.from(want)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** The failed deliveries in a webhook payload: [{ to, code, title, details, at }]. */
export function failedStatuses(payload) {
    const out = []
    for (const entry of payload?.entry || []) for (const ch of entry.changes || []) for (const st of ch.value?.statuses || []) {
        if (st.status !== 'failed') continue
        const e = (st.errors || [])[0] || {}
        out.push({ to: st.recipient_id || '', code: e.code || 0, title: e.title || e.message || '', details: e.error_data?.details || '', at: Number(st.timestamp) ? Number(st.timestamp) * 1000 : Date.now() })
    }
    return out
}

/** The last 9 digits of a phone number: the same person whether it was typed +212 6 12 34 56 78, 00212612345678 or 0612345678. '' when it is not a phone. */
export function phoneTail(raw) {
    const d = String(raw || '').replace(/[^0-9]/g, '')
    return d.length < 8 ? '' : d.slice(-9)
}

const KINDS = ['text', 'image', 'audio', 'video', 'document', 'location', 'sticker', 'contacts', 'button', 'interactive', 'reaction']
/** The messages people wrote to the company number in a webhook payload: [{ from, id, at, kind, text, name }]. */
export function incomingMessages(payload) {
    const out = []
    for (const entry of payload?.entry || []) for (const ch of entry.changes || []) {
        const v = ch.value || {}
        const names = Object.fromEntries((v.contacts || []).map((c) => [c.wa_id, c.profile?.name || '']))
        for (const m of v.messages || []) {
            if (!m?.from || !m.id || m.type === 'reaction') continue
            const kind = KINDS.includes(m.type) ? m.type : 'other'
            const media = m[m.type] || {}
            const text = m.type === 'text' ? m.text?.body || '' : m.type === 'button' ? m.button?.text || '' : m.type === 'interactive' ? m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '' : m.type === 'location' ? [media.name, media.address, media.latitude != null ? `${media.latitude}, ${media.longitude}` : ''].filter(Boolean).join(' · ') : media.caption || media.filename || ''
            out.push({ from: String(m.from), id: String(m.id), at: Number(m.timestamp) ? Number(m.timestamp) * 1000 : Date.now(), kind, text: String(text).slice(0, 4000), name: names[m.from] || '' })
        }
    }
    return out
}

/** What became of the messages we sent, in a webhook payload: [{ id, status: sent | delivered | read | failed, error }]. */
export function deliveryStatuses(payload) {
    const out = []
    for (const entry of payload?.entry || []) for (const ch of entry.changes || []) for (const st of ch.value?.statuses || []) {
        if (!st?.id || !['sent', 'delivered', 'read', 'failed'].includes(st.status)) continue
        const e = (st.errors || [])[0]
        out.push({ id: String(st.id), status: st.status, error: e ? explainWhatsapp({ code: e.code, message: e.title || e.message, error_data: e.error_data }) : '' })
    }
    return out
}

/** A status never goes backwards: "read" is not replaced by a late "delivered". */
const RANK = { failed: 0, sent: 1, delivered: 2, read: 3 }
export const statusMoves = (from, to) => to === 'failed' ? from !== 'read' && from !== 'delivered' : (RANK[to] || 0) > (RANK[from] || 0)

/** WhatsApp lets a business write a free text only during the 24 hours after the last message of the person; after that, an approved template. */
export const windowOpen = (lastInAt, now = Date.now()) => !!lastInAt && +now - +new Date(lastInAt) < 24 * 3600 * 1000
