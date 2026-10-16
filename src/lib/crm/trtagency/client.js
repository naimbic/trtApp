import * as client from 'openid-client'
import { createRemoteJWKSet, jwtVerify, customFetch as joseFetch } from 'jose'
import { SCOPE } from './config.js'

// Talks to the provider: discovery, the authorization address, the code exchange and the ID token checks.
const HOUR = 3600 * 1000

/** Node cannot resolve *.localhost (browsers can): such a provider is reached by IP with its own Host header. */
export function fetchFor(cfg, base = fetch) {
    return async (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url || input.href || String(input))
        if (!url.hostname.endsWith('.localhost')) return base(input, init)
        const headers = new Headers(init.headers || (typeof input === 'object' && input.headers) || {})
        headers.set('host', url.host)
        const target = new URL(url)
        target.hostname = cfg.devIp || '127.0.0.1'
        return base(target, { ...init, headers })
    }
}

const cache = new Map()
async function configurationFor(cfg) {
    const key = [cfg.issuer, cfg.clientId, cfg.clientSecret, cfg.redirectUri].join('|')
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < HOUR) return hit
    const f = fetchFor(cfg)
    const config = await client.discovery(new URL(cfg.issuer), cfg.clientId, { redirect_uris: [cfg.redirectUri], response_types: ['code'] }, client.ClientSecretBasic(cfg.clientSecret), {
        [client.customFetch]: f, execute: cfg.issuer.startsWith('http://') ? [client.allowInsecureRequests] : [],
    })
    config[client.customFetch] = f
    const meta = config.serverMetadata()
    const jwks = createRemoteJWKSet(new URL(meta.jwks_uri), { [joseFetch]: f, cooldownDuration: 10000 })
    const entry = { at: Date.now(), config, meta, jwks }
    cache.set(key, entry)
    return entry
}

/** The provider as the login steps use it. */
export function createOidc(cfg) {
    return {
        async authorizationUrl({ state, nonce, verifier }) {
            const { config } = await configurationFor(cfg)
            return client.buildAuthorizationUrl(config, {
                redirect_uri: cfg.redirectUri, scope: SCOPE, state, nonce,
                code_challenge: await client.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256',
            }).href
        },
        /** Exchanges the code and returns the verified claims of the ID token (plus userinfo when the email is missing). */
        async exchange({ query, state, nonce, verifier }) {
            const { config, meta, jwks } = await configurationFor(cfg)
            const current = new URL(cfg.redirectUri) // the registered address, byte for byte
            for (const [k, v] of Object.entries(query)) current.searchParams.set(k, String(v))
            const tokens = await client.authorizationCodeGrant(config, current, { pkceCodeVerifier: verifier, expectedNonce: nonce, expectedState: state })
            if (!tokens.id_token) throw new Error('The provider sent no ID token')
            // openid-client checks issuer, audience, expiry and nonce; the signature is verified here against the provider's keys
            const { payload } = await jwtVerify(tokens.id_token, jwks, { issuer: meta.issuer, audience: cfg.clientId, algorithms: ['RS256'], clockTolerance: 30 })
            if (payload.nonce !== nonce) throw new Error('The nonce of the ID token does not match')
            let claims = { ...payload }
            if (!claims.email && meta.userinfo_endpoint && tokens.access_token) {
                try { claims = { ...(await client.fetchUserInfo(config, tokens.access_token, payload.sub)), ...claims } } catch { /* the ID token alone is enough to sign in */ }
            }
            return claims
        },
    }
}

export const random = { state: client.randomState, nonce: client.randomNonce, verifier: client.randomPKCECodeVerifier }
