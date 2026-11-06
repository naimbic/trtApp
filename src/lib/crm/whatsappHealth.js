// WhatsApp connection: is the phone number reachable, is the token valid and when does it end, and renewing it with the App ID and App Secret.
// Sending a message only needs the Phone number ID and a token; the App ID / App Secret are optional and let the CRM check the token and
// swap a short-lived one for a 60-day one (and renew it again before it ends). A permanent token (a System user's) never needs it.
import { getOptions, setOptions } from '@/lib/crm/mailer'
import { alertAdmins } from '@/lib/crm/alerts'
import crypto from 'node:crypto'
import { publicBase } from '@/lib/crm/shortLinks'
import { tokenAdvice, explainWhatsapp, templateVars, templateProblem } from '@/lib/crm/whatsappCalc'

const G = 'https://graph.facebook.com/v20.0'
const KEYS = ['whatsapp_enabled', 'whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_app_id', 'whatsapp_app_secret', 'whatsapp_waba_id', 'whatsapp_template', 'whatsapp_template_lang']
const get = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    return { ok: res.ok, json: await res.json().catch(() => ({})) }
}

async function creds() {
    const o = await getOptions(KEYS)
    return { enabled: o('whatsapp_enabled') === '1', phoneId: o('whatsapp_phone_number_id'), token: o('whatsapp_access_token'), appId: o('whatsapp_app_id'), secret: o('whatsapp_app_secret'), waba: o('whatsapp_waba_id'), template: o('whatsapp_template'), lang: o('whatsapp_template_lang', 'en') }
}

/** { ok, phone, name, quality, tokenValid, expiresAt (ms, 0 = never), canRenew, advice, error } */
export async function whatsappStatus() {
    const c = await creds()
    if (!c.phoneId || !c.token) return { ok: false, error: 'Fill in the Phone number ID and the Access token, then save.' }
    const out = { ok: false, canRenew: !!(c.appId && c.secret) }
    const phone = await get(`${G}/${encodeURIComponent(c.phoneId)}?fields=display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(c.token)}`)
    if (!phone.ok) { out.error = explainWhatsapp(phone.json?.error); out.tokenValid = !(phone.json?.error?.code === 190) } else { out.ok = true; out.phone = phone.json.display_phone_number || ''; out.name = phone.json.verified_name || ''; out.quality = phone.json.quality_rating || '' }
    if (c.appId && c.secret) {
        const dbg = await get(`${G}/debug_token?input_token=${encodeURIComponent(c.token)}&access_token=${encodeURIComponent(`${c.appId}|${c.secret}`)}`)
        if (dbg.ok && dbg.json?.data) { out.tokenValid = !!dbg.json.data.is_valid; out.expiresAt = (dbg.json.data.expires_at || 0) * 1000 } else if (!dbg.ok) out.appError = 'The App ID or the App Secret is not right (Meta for Developers → App settings → Basic).'
    }
    // the templates of the WhatsApp Business account (needs its ID): is the one chosen in Settings there, approved, in that language, and how many variables does it have
    if (c.waba) {
        const t = await get(`${G}/${encodeURIComponent(c.waba)}/message_templates?fields=name,language,status,components&limit=100&access_token=${encodeURIComponent(c.token)}`)
        if (t.ok) {
            const list = (t.json.data || []).map((x) => ({ name: x.name, language: x.language, status: x.status, vars: templateVars(x.components) }))
            out.templates = list.filter((x) => x.status === 'APPROVED').map((x) => `${x.name} (${x.language})`).slice(0, 20)
            out.templateProblem = templateProblem(list, c.template, c.lang)
            const used = c.template && list.find((x) => x.name === c.template && String(x.language).toLowerCase() === String(c.lang || 'en').toLowerCase())
            if (used) await setOptions({ whatsapp_template_vars: used.vars }) // what the messages are built with
        } else out.templateError = t.json?.error?.code === 100 ? 'The WhatsApp Business Account ID is not right (Meta for Developers → WhatsApp → API setup, under the phone number).' : explainWhatsapp(t.json?.error)
    }
    // the webhook (not needed to send): its address and the verify token to give Meta, and what failed lately
    const w = await getOptions(['whatsapp_verify_token', 'whatsapp_failures'])
    let token = w('whatsapp_verify_token')
    if (!token) { token = crypto.randomBytes(16).toString('hex'); await setOptions({ whatsapp_verify_token: token }) }
    out.webhook = { url: `${publicBase()}/api/crm/public/whatsapp`, verifyToken: token }
    try { out.failures = JSON.parse(w('whatsapp_failures') || '[]').slice(0, 5) } catch { out.failures = [] }
    out.advice = tokenAdvice({ valid: out.tokenValid !== false, expiresAtSec: out.expiresAt ? Math.floor(out.expiresAt / 1000) : 0, canRenew: out.canRenew })
    return out
}

/** Swaps the saved token for a new 60-day one (needs the App ID and the App Secret). Returns { ok, expiresAt?, error? }. */
export async function renewWhatsappToken() {
    const c = await creds()
    if (!c.appId || !c.secret || !c.token) return { ok: false, error: 'Add the App ID and the App Secret in Settings first.' }
    const r = await get(`${G}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(c.appId)}&client_secret=${encodeURIComponent(c.secret)}&fb_exchange_token=${encodeURIComponent(c.token)}`)
    if (!r.ok || !r.json?.access_token) return { ok: false, error: explainWhatsapp(r.json?.error) }
    await setOptions({ whatsapp_access_token: r.json.access_token, whatsapp_token_renewed: Date.now() })
    return { ok: true, expiresAt: r.json.expires_in ? Date.now() + r.json.expires_in * 1000 : 0 }
}

/** Once a day (the watchdog calls it): renews a token that ends within 10 days, warns the administrators when it cannot be renewed. */
export async function whatsappHealthTick() {
    const c = await creds()
    if (!c.enabled || !c.token) return
    const o = await getOptions(['whatsapp_health_checked'])
    if (Date.now() - (Number(o('whatsapp_health_checked')) || 0) < 20 * 3600000) return
    await setOptions({ whatsapp_health_checked: Date.now() })
    let s = await whatsappStatus()
    if (s.advice === 'renew') { const r = await renewWhatsappToken(); if (r.ok) return; s = { ...s, error: r.error, advice: 'warn' } }
    if (s.advice === 'warn' || s.advice === 'expired' || (!s.ok && s.tokenValid === false)) {
        await alertAdmins({ key: 'whatsapp-token', title: 'The WhatsApp access token needs attention', text: s.error || (s.expiresAt ? `It ends on ${new Date(s.expiresAt).toISOString().slice(0, 10)}. Paste a permanent token in Settings → WhatsApp & Telegram, or add the App ID and App Secret.` : 'It is no longer valid.'), everyMinutes: 1440 })
    }
}
