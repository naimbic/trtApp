// Run with:  npm test      (Node's built-in test runner; no database, no network except a fake provider on 127.0.0.1)
import test from 'node:test'
import assert from 'node:assert/strict'
import { trtagencyConfig } from './config.js'
import { startLogin, finishLogin, resolveUser, safeNext, LoginError, PENDING_MS } from './logic.js'
import { createOidc, fetchFor, random } from './client.js'
import { startFakeProvider } from '../../../../scripts/fake-trtagency.mjs'

const REDIRECT = 'http://127.0.0.1:3200/api/crm/auth/trtagency/callback'
const memoryStore = () => { const m = new Map(); return { m, put: async (k, v) => { m.set(k, v) }, take: async (k) => { const v = m.get(k); m.delete(k); return v ?? null } } }
const fakeUsers = (rows = []) => ({
    rows,
    findBySub: async (sub) => rows.find((u) => u.trtagencySub === sub) || null,
    findByEmail: async (email) => rows.find((u) => u.email === email) || null,
    touch: async (id, data) => { Object.assign(rows.find((u) => u.id === id), data) },
    create: async ({ sub, username, email, name, verified }) => { const u = { id: `new${rows.length}`, trtagencySub: sub, trtagencyUsername: username, email, name, emailVerified: verified, status: 'active' }; rows.push(u); return u },
})
const cfgOf = (o = {}) => ({ autoCreate: true, linkByEmail: true, ...o })

// ---------------------------------------------------------------- configuration
test('config: nothing set means not configured, a partial set is an error, a full set is read', () => {
    assert.equal(trtagencyConfig({}), null)
    assert.match(trtagencyConfig({ TRTAGENCY_ISSUER: 'http://x' }).error, /must all be set/)
    const ok = trtagencyConfig({ TRTAGENCY_ISSUER: 'https://id.example/', TRTAGENCY_CLIENT_ID: 'crm', TRTAGENCY_CLIENT_SECRET: 's', TRTAGENCY_REDIRECT_URI: 'https://crm.example/cb' })
    assert.equal(ok.issuer, 'https://id.example')
    assert.equal(ok.autoCreate, true)
})
test('config: a redirect address the URL parser would rewrite is refused (it must be byte-identical to the registered one)', () => {
    const base = { TRTAGENCY_ISSUER: 'http://i', TRTAGENCY_CLIENT_ID: 'crm', TRTAGENCY_CLIENT_SECRET: 's' }
    assert.ok(trtagencyConfig({ ...base, TRTAGENCY_REDIRECT_URI: 'http://localhost:3000' }).error) // "http://localhost:3000/" once normalised
    assert.ok(trtagencyConfig({ ...base, TRTAGENCY_REDIRECT_URI: 'http://localhost:3000/cb?x=1' }).error)
    assert.equal(trtagencyConfig({ ...base, TRTAGENCY_REDIRECT_URI: 'http://localhost:3000/cb' }).redirectUri, 'http://localhost:3000/cb')
})
test('safeNext only keeps addresses of this site', () => {
    assert.equal(safeNext('/crm/leads?x=1'), '/crm/leads?x=1')
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', undefined, '/a\r\nSet-Cookie: x=1']) assert.equal(safeNext(bad), '/')
})

// ---------------------------------------------------------------- callback logic with fakes
const pendingStore = async (extra = {}) => { const store = memoryStore(); await store.put('S1', { nonce: 'N1', verifier: 'V1', bind: 'B1', next: '/crm/leads', at: Date.now(), ...extra }); return store }
const oidcReturning = (claims) => ({ exchange: async () => claims })

test('callback: access_denied from the provider is reported as such', async () => {
    await assert.rejects(finishLogin({ query: { error: 'access_denied', state: 'S1' }, bind: 'B1', cfg: cfgOf(), oidc: oidcReturning({}), store: await pendingStore(), users: fakeUsers() }), (e) => e instanceof LoginError && e.code === 'access_denied')
})
test('callback: another error from the provider is a provider error', async () => {
    await assert.rejects(finishLogin({ query: { error: 'server_error' }, bind: 'B1', cfg: cfgOf(), oidc: oidcReturning({}), store: await pendingStore(), users: fakeUsers() }), (e) => e.code === 'provider_error')
})
test('callback: a state we never issued, a missing code, or another browser are all invalid_state', async () => {
    const run = async (query, bind, store) => finishLogin({ query, bind, cfg: cfgOf(), oidc: oidcReturning({ sub: 'x' }), store, users: fakeUsers() })
    await assert.rejects(run({ state: 'nope', code: 'c' }, 'B1', await pendingStore()), (e) => e.code === 'invalid_state')
    await assert.rejects(run({ state: 'S1' }, 'B1', await pendingStore()), (e) => e.code === 'invalid_state')
    await assert.rejects(run({ state: 'S1', code: 'c' }, 'OTHER', await pendingStore()), (e) => e.code === 'invalid_state')
    await assert.rejects(run({ state: 'S1', code: 'c' }, undefined, await pendingStore()), (e) => e.code === 'invalid_state')
})
test('callback: the state works once (a replay finds nothing)', async () => {
    const store = await pendingStore()
    const args = { query: { state: 'S1', code: 'c' }, bind: 'B1', cfg: cfgOf(), oidc: oidcReturning({ sub: 'u1', email: 'a@x.test', email_verified: true }), store, users: fakeUsers() }
    await finishLogin(args)
    await assert.rejects(finishLogin(args), (e) => e.code === 'invalid_state')
})
test('callback: a login older than ten minutes has expired', async () => {
    const store = await pendingStore({ at: Date.now() - PENDING_MS - 1000 })
    await assert.rejects(finishLogin({ query: { state: 'S1', code: 'c' }, bind: 'B1', cfg: cfgOf(), oidc: oidcReturning({ sub: 'x' }), store, users: fakeUsers() }), (e) => e.code === 'expired')
})
test('callback: a token failure becomes token_failed and the provider message is kept for the log only', async () => {
    const oidc = { exchange: async () => { throw new Error('invalid_grant') } }
    await assert.rejects(finishLogin({ query: { state: 'S1', code: 'c' }, bind: 'B1', cfg: cfgOf(), oidc, store: await pendingStore(), users: fakeUsers() }), (e) => e.code === 'token_failed' && e.detail === 'invalid_grant' && !/invalid_grant/.test(e.message))
})
test('callback: the nonce and verifier handed to the exchange are the ones stored at the start', async () => {
    let seen
    const oidc = { exchange: async (a) => { seen = a; return { sub: 'u1', email: 'a@x.test' } } }
    const out = await finishLogin({ query: { state: 'S1', code: 'c' }, bind: 'B1', cfg: cfgOf(), oidc, store: await pendingStore(), users: fakeUsers() })
    assert.equal(seen.nonce, 'N1'); assert.equal(seen.verifier, 'V1'); assert.equal(out.next, '/crm/leads')
})

// ---------------------------------------------------------------- matching the local user
test('user: matched by sub first, and the username is kept up to date', async () => {
    const users = fakeUsers([{ id: 'a', email: 'old@x.test', trtagencySub: 'u1', trtagencyUsername: 'ada', status: 'active' }])
    const u = await resolveUser({ sub: 'u1', preferred_username: 'ada2', email: 'new@x.test' }, users, cfgOf())
    assert.equal(u.id, 'a'); assert.equal(users.rows[0].trtagencyUsername, 'ada2'); assert.equal(users.rows[0].email, 'old@x.test')
})
test('user: a verified email attaches the identity to the existing account', async () => {
    const users = fakeUsers([{ id: 'a', email: 'ada@x.test', status: 'active' }])
    const u = await resolveUser({ sub: 'u1', preferred_username: 'ada', email: 'ADA@x.test', email_verified: true }, users, cfgOf())
    assert.equal(u.id, 'a'); assert.equal(users.rows[0].trtagencySub, 'u1')
})
test('user: an unverified email never takes over an existing account', async () => {
    const users = fakeUsers([{ id: 'a', email: 'ada@x.test', status: 'active' }])
    await assert.rejects(resolveUser({ sub: 'u1', email: 'ada@x.test', email_verified: false }, users, cfgOf()), (e) => e.code === 'no_account')
    assert.equal(users.rows[0].trtagencySub, undefined)
})
test('user: linking by email can be switched off', async () => {
    const users = fakeUsers([{ id: 'a', email: 'ada@x.test', status: 'active' }])
    await assert.rejects(resolveUser({ sub: 'u1', email: 'ada@x.test', email_verified: true }, users, cfgOf({ linkByEmail: false })), (e) => e.code === 'no_account')
})
test('user: an email already tied to another identity is a conflict', async () => {
    const users = fakeUsers([{ id: 'a', email: 'ada@x.test', trtagencySub: 'other', status: 'active' }])
    await assert.rejects(resolveUser({ sub: 'u1', email: 'ada@x.test', email_verified: true }, users, cfgOf()), (e) => e.code === 'conflict')
})
test('user: an inactive account cannot sign in this way either', async () => {
    const users = fakeUsers([{ id: 'a', email: 'ada@x.test', trtagencySub: 'u1', status: 'inactive' }])
    await assert.rejects(resolveUser({ sub: 'u1', email: 'ada@x.test' }, users, cfgOf()), (e) => e.code === 'blocked')
})
test('user: a new person gets an account, unless creation is off or there is no email', async () => {
    const users = fakeUsers()
    const u = await resolveUser({ sub: 'u9', preferred_username: 'newbie', name: 'New Bie', email: 'n@x.test', email_verified: true }, users, cfgOf())
    assert.equal(u.trtagencySub, 'u9'); assert.equal(users.rows.length, 1)
    await assert.rejects(resolveUser({ sub: 'u10', email: 'z@x.test' }, fakeUsers(), cfgOf({ autoCreate: false })), (e) => e.code === 'no_account')
    await assert.rejects(resolveUser({ sub: 'u11', preferred_username: 'x' }, fakeUsers(), cfgOf()), (e) => e.code === 'no_email')
})

// ---------------------------------------------------------------- the whole exchange against a fake provider (RS256, PKCE, JWKS)
async function withProvider(behaviour, fn) {
    const p = await startFakeProvider({ port: 0, issuer: undefined, redirectUri: REDIRECT, behaviour })
    // port 0 picked a free one: the issuer name carries it, like the real *.localhost provider
    p.issuer = `http://trtagency.localhost:${p.port}`
    await p.close()
    const real = await startFakeProvider({ port: p.port, redirectUri: REDIRECT, behaviour })
    try { await fn(real) } finally { await real.close() }
}
const cfgFor = (p) => ({ issuer: p.issuer, clientId: 'crm', clientSecret: 'local-secret', redirectUri: REDIRECT, devIp: '127.0.0.1', autoCreate: true, linkByEmail: true })

/** What the browser does: open the authorization address, pick a person, and come back with ?code&state. */
async function browserLogin(cfg, who, { state = random.state(), nonce = random.nonce(), verifier = random.verifier() } = {}) {
    const oidc = createOidc(cfg)
    const url = new URL(await oidc.authorizationUrl({ state, nonce, verifier }))
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
    assert.equal(url.searchParams.get('scope'), 'openid profile email')
    assert.equal(url.searchParams.get('redirect_uri'), REDIRECT)
    url.searchParams.set('as', who)
    const res = await fetchFor(cfg)(url.href, { redirect: 'manual' })
    const back = new URL(res.headers.get('location'))
    return { oidc, query: Object.fromEntries(back.searchParams), state, nonce, verifier }
}

test('provider: a real login round trip returns the verified claims', async () => {
    await withProvider({}, async (p) => {
        const cfg = cfgFor(p)
        const { oidc, query, state, nonce, verifier } = await browserLogin(cfg, 'ada')
        const claims = await oidc.exchange({ query, state, nonce, verifier })
        assert.equal(claims.sub, 'u-0001'); assert.equal(claims.preferred_username, 'ada'); assert.equal(claims.email, 'ada@trtagency.test'); assert.equal(claims.email_verified, true)
    })
})
test('provider: the same login through the whole callback logic creates the account', async () => {
    await withProvider({}, async (p) => {
        const cfg = cfgFor(p)
        const store = memoryStore(), users = fakeUsers(), oidc = createOidc(cfg)
        const { url, bind } = await startLogin({ oidc, store, rand: random, next: '/crm/leads' })
        const state = new URL(url).searchParams.get('state')
        const go = new URL(url); go.searchParams.set('as', 'ada')
        const back = new URL((await fetchFor(cfg)(go.href, { redirect: 'manual' })).headers.get('location'))
        const out = await finishLogin({ query: Object.fromEntries(back.searchParams), bind, cfg, oidc, store, users })
        assert.equal(out.user.trtagencySub, 'u-0001'); assert.equal(out.next, '/crm/leads'); assert.equal(store.m.has(state), false)
    })
})
test('provider: a person who cancels comes back with access_denied', async () => {
    await withProvider({}, async (p) => {
        const cfg = cfgFor(p)
        const { query } = await browserLogin(cfg, 'deny')
        assert.equal(query.error, 'access_denied')
    })
})
for (const [name, behaviour] of [['an ID token with the wrong nonce', { badNonce: true }], ['an expired ID token', { expired: true }], ['an ID token for another client (audience)', { badAudience: true }], ['an ID token from another issuer', { badIssuer: true }], ['an ID token signed with a key that is not in the JWKS', { otherKey: true }]]) {
    test(`provider: ${name} is refused`, async () => {
        await withProvider(behaviour, async (p) => {
            const cfg = cfgFor(p)
            const { oidc, query, state, nonce, verifier } = await browserLogin(cfg, 'ada')
            await assert.rejects(oidc.exchange({ query, state, nonce, verifier }))
        })
    })
}
test('provider: a code cannot be used twice, and a wrong PKCE verifier is refused', async () => {
    await withProvider({}, async (p) => {
        const cfg = cfgFor(p)
        const a = await browserLogin(cfg, 'ada')
        await a.oidc.exchange({ query: a.query, state: a.state, nonce: a.nonce, verifier: a.verifier })
        await assert.rejects(a.oidc.exchange({ query: a.query, state: a.state, nonce: a.nonce, verifier: a.verifier }))
        const b = await browserLogin(cfg, 'ada')
        await assert.rejects(b.oidc.exchange({ query: b.query, state: b.state, nonce: b.nonce, verifier: random.verifier() }))
    })
})
test('provider: when the ID token has no email, userinfo fills it in', async () => {
    await withProvider({ noEmail: true }, async (p) => {
        const cfg = cfgFor(p)
        const { oidc, query, state, nonce, verifier } = await browserLogin(cfg, 'ada')
        const claims = await oidc.exchange({ query, state, nonce, verifier })
        assert.equal(claims.email, 'ada@trtagency.test')
    })
})
test('provider: a state that does not match the one expected is refused', async () => {
    await withProvider({}, async (p) => {
        const cfg = cfgFor(p)
        const { oidc, query, nonce, verifier } = await browserLogin(cfg, 'ada')
        await assert.rejects(oidc.exchange({ query, state: 'another-state', nonce, verifier }))
    })
})
