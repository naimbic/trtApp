// What happens when someone with no account signs in with Google or GitHub. No database: tested on its own.

/** The code the sign-in page explains, from the switch and what is already known about that email. */
export function signupOutcome({ enabled, existing }) {
    if (!enabled) return { code: 'no_account', create: false, notify: false }
    if (!existing) return { code: 'request_sent', create: true, notify: true }
    if (existing.status === 'pending') return { code: 'request_pending', create: false, notify: false }
    if (existing.status === 'rejected') return { code: 'request_rejected', create: false, notify: false }
    // approved but no account any more (deleted since): ask again
    return { code: 'request_sent', create: true, notify: true, reopen: true }
}

/** First and last name from the name the provider gives ("Sara Benali" -> Sara / Benali). */
export function splitName(name, email) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return { firstName: String(email || '').split('@')[0] || 'New member', lastName: '' }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}
