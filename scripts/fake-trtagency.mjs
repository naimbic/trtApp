#!/usr/bin/env node
/**
 * A stand-in for the trtAgency identity provider (Puter's OpenID Connect provider), for local tests of "Sign in with trtAgency"
 * when the real one is not running. Same endpoints, RS256 ID tokens, PKCE S256, client_secret_basic.
 *
 *   node scripts/fake-trtagency.mjs                 listens on http://trtagency.localhost:4100 (browsers resolve *.localhost)
 *   PORT=4100 CLIENT_ID=crm CLIENT_SECRET=local-secret REDIRECT_URI=http://127.0.0.1:3200/api/crm/auth/trtagency/callback node scripts/fake-trtagency.mjs
 *
 * The authorize page lists a few people; the one you click is signed in. Never use it outside development.
 */
import http from 'node:http'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { generateKeyPair, exportJWK, SignJWT } from 'jose'

export const DEFAULT_USERS = {
    ada: { sub: 'u-0001', preferred_username: 'ada', name: 'Ada Lovelace', email: 'ada@trtagency.test', email_verified: true },
    grace: { sub: 'u-0002', preferred_username: 'grace', name: 'Grace Hopper', email: 'grace@trtagency.test', email_verified: false },
    noemail: { sub: 'u-0003', preferred_username: 'noemail', name: 'No Email' },
}

export async function startFakeProvider({ port = 4100, issuer, clientId = 'crm', clientSecret = 'local-secret', redirectUri, users = DEFAULT_USERS, behaviour = {} } = {}) {
    const keys = await generateKeyPair('RS256', { extractable: true })
    const other = await generateKeyPair('RS256', { extractable: true })
    const jwk = { ...(await exportJWK(keys.publicKey)), kid: 'fake-1', alg: 'RS256', use: 'sig' }
    const codes = new Map()
    const base = issuer || `http://trtagency.localhost:${port}`
    const b64 = (s) => Buffer.from(s).toString('base64url')
    const send = (res, status, body, type = 'application/json') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)) }

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, base)
        const p = url.pathname
        if (p === '/.well-known/openid-configuration') return send(res, 200, { issuer: base, authorization_endpoint: `${base}/oauth/authorize`, token_endpoint: `${base}/oauth/token`, userinfo_endpoint: `${base}/oauth/userinfo`, jwks_uri: `${base}/oauth/jwks`, response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'], token_endpoint_auth_methods_supported: ['client_secret_basic'], code_challenge_methods_supported: ['S256'], scopes_supported: ['openid', 'profile', 'email'] })
        if (p === '/oauth/jwks') return send(res, 200, { keys: [jwk] })
        if (p === '/oauth/authorize') {
            const q = Object.fromEntries(url.searchParams)
            if (q.client_id !== clientId) return send(res, 400, 'unknown client', 'text/plain')
            if (redirectUri && q.redirect_uri !== redirectUri) return send(res, 400, 'redirect_uri is not registered (matching is exact)', 'text/plain')
            if (q.response_type !== 'code' || q.code_challenge_method !== 'S256' || !q.code_challenge) return send(res, 400, 'authorization code + PKCE S256 required', 'text/plain')
            const finish = (who, deny) => {
                const back = new URL(q.redirect_uri)
                if (q.state) back.searchParams.set('state', q.state)
                if (deny) back.searchParams.set('error', 'access_denied')
                else { const code = crypto.randomBytes(16).toString('hex'); codes.set(code, { who, q, at: Date.now() }); back.searchParams.set('code', code) }
                return back.href
            }
            if (url.searchParams.get('as')) { res.writeHead(302, { location: finish(url.searchParams.get('as'), url.searchParams.get('as') === 'deny') }); return res.end() }
            const links = [...Object.keys(users), 'deny'].map((k) => { const u = new URL(url); u.searchParams.set('as', k); return `<li><a href="${u.pathname}${u.search}">${k === 'deny' ? 'Cancel (access_denied)' : `Sign in as ${users[k].name} (${users[k].email || 'no email'})`}</a></li>` }).join('')
            return send(res, 200, `<!doctype html><meta charset=utf-8><title>trtAgency (fake)</title><body style="font-family:sans-serif;max-width:480px;margin:60px auto"><h2>trtAgency <small>(fake, development only)</small></h2><p>Who are you?</p><ul>${links}</ul>`, 'text/html')
        }
        if (p === '/oauth/token' && req.method === 'POST') {
            let body = ''
            for await (const c of req) body += c
            const f = Object.fromEntries(new URLSearchParams(body))
            const basic = (req.headers.authorization || '').replace(/^Basic /, '')
            const [id, secret] = Buffer.from(basic, 'base64').toString().split(':').map(decodeURIComponent)
            if (id !== clientId || secret !== clientSecret) return send(res, 401, { error: 'invalid_client' })
            const rec = codes.get(f.code)
            codes.delete(f.code) // a code works once
            if (!rec || f.grant_type !== 'authorization_code') return send(res, 400, { error: 'invalid_grant' })
            if (f.redirect_uri !== rec.q.redirect_uri) return send(res, 400, { error: 'invalid_grant', error_description: 'redirect_uri mismatch' })
            if (b64(crypto.createHash('sha256').update(f.code_verifier || '').digest()) !== rec.q.code_challenge) return send(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' })
            const who = users[rec.who]
            const now = Math.floor(Date.now() / 1000)
            const claims = { ...who }
            if (behaviour.noEmail) { delete claims.email; delete claims.email_verified }
            const id_token = await new SignJWT({ ...claims, nonce: behaviour.badNonce ? 'wrong' : rec.q.nonce })
                .setProtectedHeader({ alg: 'RS256', kid: 'fake-1' }).setIssuer(behaviour.badIssuer ? 'http://evil.example' : base).setAudience(behaviour.badAudience ? 'someone-else' : clientId)
                .setSubject(who.sub).setIssuedAt(now - (behaviour.expired ? 7200 : 0)).setExpirationTime(now + (behaviour.expired ? -3600 : 600)).sign(behaviour.otherKey ? other.privateKey : keys.privateKey)
            const access_token = `at-${crypto.randomBytes(8).toString('hex')}`
            codes.set(access_token, { who: rec.who, q: rec.q, at: Date.now() })
            return send(res, 200, { access_token, token_type: 'Bearer', expires_in: 600, id_token, scope: rec.q.scope })
        }
        if (p === '/oauth/userinfo') {
            const rec = codes.get((req.headers.authorization || '').replace(/^Bearer /, ''))
            return rec ? send(res, 200, users[rec.who]) : send(res, 401, { error: 'invalid_token' })
        }
        send(res, 404, { error: 'not_found' })
    })
    await new Promise((r) => server.listen(port, '127.0.0.1', r))
    return { server, port: server.address().port, issuer: base, behaviour, close: () => new Promise((r) => server.close(r)) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const port = Number(process.env.PORT) || 4100
    const p = await startFakeProvider({ port, issuer: process.env.ISSUER || undefined, clientId: process.env.CLIENT_ID || 'crm', clientSecret: process.env.CLIENT_SECRET || 'local-secret', redirectUri: process.env.REDIRECT_URI })
    console.log(`Fake trtAgency on ${p.issuer} (client ${process.env.CLIENT_ID || 'crm'}). Ctrl+C to stop.`)
}
