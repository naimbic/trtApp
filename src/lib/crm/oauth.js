import crypto from 'node:crypto'
import { SignJWT, jwtVerify, generateKeyPair, exportJWK, importJWK } from 'jose'
import prisma from '@/lib/prisma'
import { requirePermission, isCrmAdmin, getStaffId } from '@/lib/crm/permissions'
import { seal, open } from '@/lib/crm/ai/secret'
import { publicBase } from '@/lib/crm/shortLinks'
import { buildUserAuthority } from '@/lib/crm/authBuild'
import { rateLimit, clientIp } from '@/lib/rateLimit'

/* The CRM as an OpenID Connect provider: team members sign in to other apps (Meet) with their CRM account.
   Authorization code flow with PKCE, RS256 tokens. Only active staff can sign in: clients never. */

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
const b64url = (b) => Buffer.from(b).toString('base64url')
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y) }
const ACCESS_TTL = 3600, ID_TTL = 600, CODE_TTL_MS = 60000
export const issuer = () => publicBase()
const SCOPES = ['openid', 'profile', 'email']

/* ------------------------------------------------------------ signing keys */
let cached = null
async function keys() {
    if (cached) return cached
    const get = async () => (await prisma.crmOption.findMany({ where: { name: { in: ['oauth_jwk_public', 'oauth_jwk_private'] } } })).reduce((a, r) => ({ ...a, [r.name]: r.value }), {})
    let o = await get()
    if (!o.oauth_jwk_public || !o.oauth_jwk_private) {
        const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
        const pub = { ...(await exportJWK(publicKey)), alg: 'RS256', use: 'sig' }
        pub.kid = sha(`${pub.n}${pub.e}`).slice(0, 16)
        const priv = { ...(await exportJWK(privateKey)), alg: 'RS256', use: 'sig', kid: pub.kid }
        await prisma.crmOption.create({ data: { name: 'oauth_jwk_public', value: JSON.stringify(pub), autoload: false } }).catch(() => {})
        await prisma.crmOption.create({ data: { name: 'oauth_jwk_private', value: seal(JSON.stringify(priv)), autoload: false } }).catch(() => {})
        o = await get() // another request may have won the race: use what is stored
    }
    const pub = JSON.parse(o.oauth_jwk_public), priv = JSON.parse(open(o.oauth_jwk_private))
    cached = { pub, kid: pub.kid, publicKey: await importJWK(pub, 'RS256'), privateKey: await importJWK(priv, 'RS256') }
    return cached
}

export async function jwks() { return { keys: [(await keys()).pub] } }

export function discovery() {
    const base = issuer()
    return {
        issuer: base, authorization_endpoint: `${base}/api/oauth/authorize`, token_endpoint: `${base}/api/oauth/token`, userinfo_endpoint: `${base}/api/oauth/userinfo`,
        jwks_uri: `${base}/api/oauth/jwks`, end_session_endpoint: `${base}/api/oauth/logout`, response_types_supported: ['code'], grant_types_supported: ['authorization_code'],
        subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'], scopes_supported: SCOPES, code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'], claims_supported: ['sub', 'name', 'given_name', 'family_name', 'email', 'email_verified', 'picture', 'phone_number', 'locale', 'linkedin', 'staff_id', 'admin', 'role'],
    }
}

/* ------------------------------------------------------------ who may sign in, and what the app learns */
async function claimsFor(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.status === 'inactive' || user.status === 'blocked') return null
    const staff = await prisma.crmStaff.findFirst({ where: { userId: user.id, active: true }, select: { id: true, firstName: true, lastName: true, phoneNumber: true, defaultLanguage: true, profileImage: true, linkedin: true } })
    if (!staff) return null // clients and former members are refused
    const { authority, blocked } = await buildUserAuthority(user)
    if (blocked) return null
    const raw = user.image || staff.profileImage
    const img = raw ? (/^https?:/i.test(raw) ? raw : `${issuer()}${raw.startsWith('/') ? '' : '/'}${raw}`) : undefined
    const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    return clean({ sub: user.id, name: user.name || [staff.firstName, staff.lastName].filter(Boolean).join(' ') || user.email, given_name: staff.firstName || user.firstName, family_name: staff.lastName || user.lastName, email: user.email, email_verified: true, picture: img, phone_number: staff.phoneNumber || user.phone, locale: staff.defaultLanguage, linkedin: staff.linkedin, staff_id: staff.id, admin: isCrmAdmin(authority), role: user.role })
}

/* ------------------------------------------------------------ the apps (clients), for the super administrator */
async function requireAdmin() {
    const session = await requirePermission(null)
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Only the super administrator can manage the sign-in apps', 403)
    return session
}
const uris = (list, what) => {
    const out = [...new Set((Array.isArray(list) ? list : String(list || '').split(/[\n,]+/)).map((x) => String(x).trim()).filter(Boolean))]
    for (const u of out) {
        let p
        try { p = new URL(u) } catch { throw fail(`${what}: "${u}" is not a valid address`) }
        if (!['https:', 'http:'].includes(p.protocol) || p.hash) throw fail(`${what}: "${u}" must be an http(s) address without #`)
        if (p.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(p.hostname) && process.env.NODE_ENV === 'production') throw fail(`${what}: "${u}" must use https`)
    }
    return out
}
const shapeClient = (c) => ({ id: c.id, name: c.name, clientId: c.clientId, redirectUris: c.redirectUris, logoutUris: c.logoutUris, active: c.active, lastUsedAt: c.lastUsedAt, logins: c.logins, createdAt: c.createdAt })

export async function listClients() {
    await requireAdmin()
    return { clients: (await prisma.crmOauthClient.findMany({ orderBy: { createdAt: 'desc' } })).map(shapeClient), endpoints: discovery() }
}

export async function createClient(body = {}) {
    const session = await requireAdmin()
    const name = String(body.name || '').trim().slice(0, 80)
    if (!name) throw fail('Give the app a name')
    const redirectUris = uris(body.redirectUris, 'Redirect address')
    if (!redirectUris.length) throw fail('Add at least one redirect address (where the app receives the sign-in)')
    const secret = `trts_${crypto.randomBytes(32).toString('base64url')}`
    const row = await prisma.crmOauthClient.create({ data: { name, clientId: `trtapp_${crypto.randomBytes(12).toString('hex')}`, secretHash: sha(secret), redirectUris, logoutUris: uris(body.logoutUris, 'Sign-out address'), createdBy: await getStaffId(session) } })
    return { success: true, client: shapeClient(row), secret }
}

export async function updateClient(id, body = {}) {
    await requireAdmin()
    const cur = /^[a-f0-9]{24}$/i.test(String(id)) && (await prisma.crmOauthClient.findUnique({ where: { id } }))
    if (!cur) throw fail('App not found', 404)
    const data = {}
    if (body.name !== undefined) { const n = String(body.name || '').trim().slice(0, 80); if (!n) throw fail('Give the app a name'); data.name = n }
    if (body.redirectUris !== undefined) { data.redirectUris = uris(body.redirectUris, 'Redirect address'); if (!data.redirectUris.length) throw fail('Add at least one redirect address') }
    if (body.logoutUris !== undefined) data.logoutUris = uris(body.logoutUris, 'Sign-out address')
    if (body.active !== undefined) data.active = !!body.active
    let secret
    if (body.rotateSecret) { secret = `trts_${crypto.randomBytes(32).toString('base64url')}`; data.secretHash = sha(secret) }
    const row = await prisma.crmOauthClient.update({ where: { id }, data })
    return { success: true, client: shapeClient(row), ...(secret ? { secret } : {}) }
}

export async function deleteClient(id) {
    await requireAdmin()
    const cur = /^[a-f0-9]{24}$/i.test(String(id)) && (await prisma.crmOauthClient.findUnique({ where: { id } }))
    if (!cur) throw fail('App not found', 404)
    await prisma.crmOauthClient.delete({ where: { id } })
    await prisma.crmOauthCode.deleteMany({ where: { clientId: cur.clientId } })
    return { success: true }
}

/* ------------------------------------------------------------ authorize */
/** Returns { error (shown to the person, nothing is redirected) } | { redirect } | { signIn: true }. `userId` comes from the CRM session. */
export async function authorize(params, userId) {
    const client = params.client_id && (await prisma.crmOauthClient.findUnique({ where: { clientId: String(params.client_id) } }))
    if (!client || !client.active) return { error: 'Unknown or disabled app' }
    if (!client.redirectUris.includes(params.redirect_uri)) return { error: 'This redirect address is not registered for the app' }
    const back = (q) => { const u = new URL(params.redirect_uri); for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v); if (params.state) u.searchParams.set('state', params.state); u.searchParams.set('iss', issuer()); return { redirect: u.toString() } }
    if (params.response_type !== 'code') return back({ error: 'unsupported_response_type' })
    const scope = String(params.scope || 'openid').split(/\s+/).filter((s) => SCOPES.includes(s))
    if (!scope.includes('openid')) return back({ error: 'invalid_scope', error_description: 'openid is required' })
    if (params.code_challenge && params.code_challenge_method !== 'S256') return back({ error: 'invalid_request', error_description: 'Only S256 is supported for PKCE' })
    if (!userId) return params.prompt === 'none' ? back({ error: 'login_required' }) : { signIn: true }
    if (!(await claimsFor(userId))) return back({ error: 'access_denied', error_description: 'Only active team members can sign in' })
    prisma.crmOauthCode.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {})
    const code = crypto.randomBytes(32).toString('base64url')
    await prisma.crmOauthCode.create({ data: { codeHash: sha(code), clientId: client.clientId, userId, redirectUri: params.redirect_uri, challenge: params.code_challenge || null, nonce: params.nonce || null, scope: scope.join(' '), authTime: new Date(), expiresAt: new Date(Date.now() + CODE_TTL_MS) } })
    return back({ code })
}

/* ------------------------------------------------------------ token */
const oerr = (error, description, status = 400) => Object.assign(new Error(description || error), { oauth: error, status })

export async function token(form, authHeader, request) {
    rateLimit(`oauth-token:${clientIp(request)}`, 60, 60000)
    let clientId = form.client_id, secret = form.client_secret
    if (/^basic /i.test(authHeader || '')) { const [i, s] = Buffer.from(authHeader.slice(6), 'base64').toString().split(/:(.*)/s); clientId = decodeURIComponent(i); secret = decodeURIComponent(s || '') }
    const client = clientId && (await prisma.crmOauthClient.findUnique({ where: { clientId: String(clientId) } }))
    if (!client || !client.active || !secret || !safeEq(sha(secret), client.secretHash)) throw oerr('invalid_client', 'Wrong client or secret', 401)
    if (form.grant_type !== 'authorization_code') throw oerr('unsupported_grant_type', 'Only authorization_code is supported')
    const row = form.code && (await prisma.crmOauthCode.findUnique({ where: { codeHash: sha(form.code) } }))
    if (row) await prisma.crmOauthCode.delete({ where: { id: row.id } }).catch(() => {}) // one use only
    if (!row || row.clientId !== client.clientId || row.expiresAt < new Date()) throw oerr('invalid_grant', 'The code is wrong, used or expired')
    if (row.redirectUri !== form.redirect_uri) throw oerr('invalid_grant', 'redirect_uri does not match')
    if (row.challenge) {
        const v = form.code_verifier && b64url(crypto.createHash('sha256').update(String(form.code_verifier)).digest())
        if (!v || !safeEq(v, row.challenge)) throw oerr('invalid_grant', 'PKCE check failed')
    }
    const claims = await claimsFor(row.userId)
    if (!claims) throw oerr('access_denied', 'Only active team members can sign in', 403)
    const k = await keys(), now = Math.floor(Date.now() / 1000), base = issuer()
    const sign = (payload, typ, ttl) => new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid: k.kid, typ }).setIssuer(base).setAudience(client.clientId).setSubject(claims.sub).setIssuedAt(now).setExpirationTime(now + ttl).sign(k.privateKey)
    const idPayload = { ...claims, auth_time: Math.floor(row.authTime.getTime() / 1000), ...(row.nonce ? { nonce: row.nonce } : {}) }
    const [id_token, access_token] = await Promise.all([sign(idPayload, 'JWT', ID_TTL), sign({ scope: row.scope, client_id: client.clientId }, 'at+jwt', ACCESS_TTL)])
    await prisma.crmOauthClient.update({ where: { id: client.id }, data: { lastUsedAt: new Date(), logins: { increment: 1 } } })
    return { access_token, token_type: 'Bearer', expires_in: ACCESS_TTL, id_token, scope: row.scope }
}

/* ------------------------------------------------------------ userinfo */
export async function userinfo(authHeader) {
    const t = /^bearer /i.test(authHeader || '') ? authHeader.slice(7).trim() : ''
    if (!t) throw oerr('invalid_token', 'Send the access token as a Bearer header', 401)
    let payload
    try { payload = (await jwtVerify(t, (await keys()).publicKey, { issuer: issuer(), algorithms: ['RS256'] })).payload } catch { throw oerr('invalid_token', 'The token is not valid or expired', 401) }
    const client = await prisma.crmOauthClient.findUnique({ where: { clientId: String(payload.client_id || '') } })
    if (!client || !client.active) throw oerr('invalid_token', 'The app is disabled', 401)
    const claims = await claimsFor(payload.sub)
    if (!claims) throw oerr('invalid_token', 'This person can no longer sign in', 401)
    return claims
}

/** Where a sign-out may send the person back: only an address registered for the app. */
export async function logoutTarget(clientId, uri) {
    const c = clientId && (await prisma.crmOauthClient.findUnique({ where: { clientId: String(clientId) } }))
    return c && uri && (c.logoutUris.includes(uri) || c.redirectUris.includes(uri)) ? uri : null
}
