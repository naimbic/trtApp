/**
 * Sign in with trtAgency (OpenID Connect). Everything comes from the environment; nothing secret is stored in code:
 *   TRTAGENCY_ISSUER         https://<agency domain>   (local: http://trtagency.localhost:4100)
 *   TRTAGENCY_CLIENT_ID      the id registered by the trtAgency administrator (oidc_provider.clients)
 *   TRTAGENCY_CLIENT_SECRET  its secret
 *   TRTAGENCY_REDIRECT_URI   the exact callback address registered there, e.g. https://crm.example.com/api/crm/auth/trtagency/callback
 * Optional:
 *   TRTAGENCY_DEV_IP         address to reach a *.localhost provider server-to-server (default 127.0.0.1)
 *   TRTAGENCY_AUTO_CREATE    "false" = people without a CRM account are refused instead of getting one (default: create)
 *   TRTAGENCY_LINK_BY_EMAIL  "false" = never attach a trtAgency identity to an existing account by its verified email
 */
export const SCOPE = 'openid profile email'

/** null = not configured (the button stays hidden); { error } = configured wrongly; otherwise the settings. */
export function trtagencyConfig(env = process.env) {
    const issuer = String(env.TRTAGENCY_ISSUER || '').trim()
    const clientId = String(env.TRTAGENCY_CLIENT_ID || '').trim()
    const clientSecret = String(env.TRTAGENCY_CLIENT_SECRET || '').trim()
    const redirectUri = String(env.TRTAGENCY_REDIRECT_URI || '').trim()
    if (!issuer && !clientId && !clientSecret && !redirectUri) return null
    if (!issuer || !clientId || !clientSecret || !redirectUri) return { error: 'TRTAGENCY_ISSUER, TRTAGENCY_CLIENT_ID, TRTAGENCY_CLIENT_SECRET and TRTAGENCY_REDIRECT_URI must all be set' }
    let url
    try { url = new URL(redirectUri) } catch { return { error: 'TRTAGENCY_REDIRECT_URI is not a valid address' } }
    // the address sent to the provider must be byte-identical to the registered one: refuse anything the URL parser would rewrite
    if (url.href !== redirectUri || url.search || url.hash) return { error: `TRTAGENCY_REDIRECT_URI must be written exactly as ${url.href.split('?')[0].split('#')[0]} (no query, no fragment, normalised)` }
    return {
        issuer: issuer.replace(/\/+$/, ''), clientId, clientSecret, redirectUri,
        devIp: String(env.TRTAGENCY_DEV_IP || '127.0.0.1'),
        autoCreate: String(env.TRTAGENCY_AUTO_CREATE || '').toLowerCase() !== 'false',
        linkByEmail: String(env.TRTAGENCY_LINK_BY_EMAIL || '').toLowerCase() !== 'false',
    }
}
