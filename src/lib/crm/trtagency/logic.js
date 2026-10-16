// The login steps, free of any framework: the provider, the storage and the user table are handed in, so they can be tested.
export const PENDING_MS = 10 * 60 * 1000

/** What a person is told. The code goes in the address (/sign-in?oidc_error=code), the screens translate the text. */
export const MESSAGES = {
    not_configured: 'Sign in with trtAgency is not set up on this server.',
    access_denied: 'You cancelled the sign-in with trtAgency.',
    provider_error: 'trtAgency could not sign you in. Try again.',
    invalid_state: 'This sign-in link is not valid any more. Start again.',
    expired: 'The sign-in took too long. Start again.',
    token_failed: 'trtAgency answered with something we could not verify. Try again, or use your email and password.',
    no_subject: 'trtAgency did not tell us who you are.',
    no_email: 'Your trtAgency account has no email address, which is needed to create your account here.',
    no_account: 'There is no account for you here yet. Ask an administrator to add you.',
    conflict: 'This email address already belongs to another trtAgency identity. Ask an administrator.',
    blocked: 'Your account is disabled. Ask an administrator.',
}

export class LoginError extends Error {
    constructor(code, detail) { super(MESSAGES[code] || MESSAGES.provider_error); this.code = code; this.detail = detail }
}

/** Only addresses of this site: "/crm/leads", never "https://elsewhere" or "//elsewhere". */
export const safeNext = (p) => (typeof p === 'string' && /^\/(?![/\\])/.test(p) && !/[\r\n]/.test(p) ? p : '/')

/** Starts a login: remembers state, nonce and the PKCE verifier on the server and returns the provider address + the cookie value. */
export async function startLogin({ oidc, store, rand, next, now = Date.now }) {
    const state = rand.state(), nonce = rand.nonce(), verifier = rand.verifier(), bind = rand.state()
    await store.put(state, { verifier, nonce, bind, next: safeNext(next), at: now() })
    return { url: await oidc.authorizationUrl({ state, nonce, verifier }), bind }
}

/**
 * Finishes a login from what came back on the callback address. Nothing from the browser is believed except the code:
 * the state must be one we issued (once only, same browser, not too old), the code is exchanged server-to-server and the
 * ID token is verified by the provider adapter (signature, issuer, audience, expiry, nonce).
 */
export async function finishLogin({ query, bind, cfg, oidc, store, users, now = Date.now }) {
    if (query.error) throw new LoginError(query.error === 'access_denied' ? 'access_denied' : 'provider_error', query.error_description || query.error)
    const state = String(query.state || ''), code = String(query.code || '')
    if (!state || !code) throw new LoginError('invalid_state')
    const pending = await store.take(state) // one use only: a replayed callback finds nothing
    if (!pending) throw new LoginError('invalid_state')
    if (now() - pending.at > PENDING_MS) throw new LoginError('expired')
    if (!bind || bind !== pending.bind) throw new LoginError('invalid_state') // started in another browser
    let claims
    try { claims = await oidc.exchange({ query, state, nonce: pending.nonce, verifier: pending.verifier }) } catch (e) { throw new LoginError('token_failed', e?.message) }
    if (!claims?.sub) throw new LoginError('no_subject')
    return { user: await resolveUser(claims, users, cfg), next: pending.next }
}

/**
 * The local user of a trtAgency identity: by the stable `sub`; else by a verified email (the identity is attached to the
 * existing account); else a new account without any permission (an administrator gives it a role).
 */
export async function resolveUser(claims, users, cfg) {
    const sub = String(claims.sub)
    const username = claims.preferred_username ? String(claims.preferred_username) : null
    const email = claims.email ? String(claims.email).trim().toLowerCase() : null
    const verified = claims.email_verified === true
    const own = await users.findBySub(sub)
    if (own) {
        if (own.status === 'inactive' || own.status === 'blocked') throw new LoginError('blocked')
        if (username && own.trtagencyUsername !== username) await users.touch(own.id, { trtagencyUsername: username })
        return own
    }
    if (email) {
        const same = await users.findByEmail(email)
        if (same) {
            if (same.trtagencySub && same.trtagencySub !== sub) throw new LoginError('conflict')
            if (!verified || !cfg.linkByEmail) throw new LoginError('no_account', 'email not verified or linking by email is off')
            if (same.status === 'inactive' || same.status === 'blocked') throw new LoginError('blocked')
            await users.touch(same.id, { trtagencySub: sub, trtagencyUsername: username })
            return { ...same, trtagencySub: sub }
        }
    }
    if (!cfg.autoCreate) throw new LoginError('no_account')
    if (!email) throw new LoginError('no_email')
    return users.create({ sub, username, email, name: claims.name ? String(claims.name) : username || email, verified })
}
