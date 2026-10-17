// Sign in with Google or GitHub: who may come in, free of any framework so it can be tested.
// Only people who already have an account here (matched by email) can sign in this way: nobody gets an account by having a Google or GitHub login.
export const SOCIAL = ['google', 'github']

/** Which buttons the sign-in page shows: a provider is on when its keys are set (GOOGLE_AUTH_CLIENT_ID / _SECRET, GITHUB_AUTH_CLIENT_ID / _SECRET). */
export function socialProviders(env = process.env) {
    return { google: !!(env.GOOGLE_AUTH_CLIENT_ID && env.GOOGLE_AUTH_CLIENT_SECRET), github: !!(env.GITHUB_AUTH_CLIENT_ID && env.GITHUB_AUTH_CLIENT_SECRET) }
}

/**
 * The local account of a Google / GitHub identity: the user with the same email, if the provider says the email is verified
 * (Google tells; GitHub only hands out the verified primary or public email). Returns { ok, user } or { ok: false, code }.
 */
export async function resolveSocialUser({ account, profile, user }, deps) {
    if (!account || !SOCIAL.includes(account.provider)) return { ok: false, code: 'provider_error' }
    const email = String(profile?.email || user?.email || '').trim().toLowerCase()
    if (!email) return { ok: false, code: 'no_email' }
    if (account.provider === 'google' && profile?.email_verified !== true) return { ok: false, code: 'unverified' }
    const local = await deps.findByEmail(email)
    if (!local) return { ok: false, code: 'no_account' }
    const { authority, blocked } = await deps.authorityOf(local)
    if (blocked || local.status === 'inactive' || local.status === 'blocked') return { ok: false, code: 'blocked' }
    return { ok: true, user: local, authority }
}
