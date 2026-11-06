// WhatsApp (Meta Cloud API): what Meta's error codes mean in plain words, and when a token needs renewing. No network: tested on its own.
const DAY = 86400000

/** A clear sentence (what to do) for an error answered by the Cloud API; the original message when the code is not known. */
export function explainWhatsapp(err = {}) {
    const code = Number(err.code), sub = Number(err.error_subcode), msg = String(err.message || '')
    if (code === 190 || /access token|session has expired|OAuthException/i.test(msg) && code !== 100) return 'The WhatsApp access token is not valid or has expired. Create a permanent token (Meta Business Settings → System users → Generate token with the whatsapp_business_messaging permission) and paste it in Settings, or add the App ID and App Secret so the CRM renews it.'
    if (code === 131030) return 'This number is not in the list of recipients allowed for the Meta test number. Add it in Meta for Developers → WhatsApp → API setup → "To", or switch to a real business number.'
    if (code === 131047 || code === 131051 || /re-engage|24 hour/i.test(msg)) return 'WhatsApp only allows a free message within 24 hours of the person writing to you. Set the name of an approved template in Settings (Template name), or ask the person to send you a message first.'
    if (code === 132000 || code === 132001 || code === 132012 || /template/i.test(msg) && /exist|param|language|translation/i.test(msg)) return 'WhatsApp does not accept the template: check its name, its language code and that its body has exactly one variable ({{1}}) in Settings.'
    if (code === 131026 || /not a whatsapp user|undeliverable/i.test(msg)) return 'This number is not on WhatsApp, or it cannot receive the message. Check the number (with the country code).'
    if (code === 100 && /phone.number|nonexisting field|unsupported post request/i.test(msg) || sub === 33) return 'The Phone number ID is not right: copy it again from Meta for Developers → WhatsApp → API setup (it is not the phone number itself).'
    if (code === 131056 || code === 130429 || code === 80007) return 'WhatsApp is slowing the account down (too many messages too fast). Try again in a few minutes.'
    if (code === 131042 || code === 131031) return 'The WhatsApp Business account has a payment or account problem: open it in Meta Business Manager.'
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
