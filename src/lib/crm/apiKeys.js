import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { requirePermission, isCrmAdmin, getStaffId } from '@/lib/crm/permissions'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })

/** What a key can be given. "read" lists and shows, "write" creates and changes (nothing can be deleted through the API). */
export const SCOPES = [
    ['leads:read', 'Read leads'], ['leads:write', 'Create and change leads'],
    ['clients:read', 'Read clients'], ['clients:write', 'Create and change clients'],
    ['tasks:read', 'Read tasks'], ['tasks:write', 'Create and change tasks'],
    ['tickets:read', 'Read tickets'],
    ['invoices:read', 'Read invoices'], ['proposals:read', 'Read proposals'], ['projects:read', 'Read projects'],
    ['ideas:read', 'Read Grow ideas'], ['ideas:write', 'Push and change Grow ideas'],
    ['staff:read', 'Read the team (names only)'],
    ['calendar:read', 'Read the meetings of a team member (with their staff id)'],
    ['calendar:write', 'Send appointment requests to the calendar (they wait for acceptance)'],
]
const SCOPE_IDS = SCOPES.map(([id]) => id)
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

/** The super administrator, or a member the role "API, webhooks and sign-in apps" allows (view = read, edit = create / change / revoke). */
async function requireAdmin(cap = 'edit') {
    try {
        return await requirePermission('api', cap)
    } catch (e) {
        if (e.status === 403) throw fail('You are not allowed to manage API keys', 403)
        throw e
    }
}

export async function listKeys() {
    await requireAdmin('view')
    const rows = await prisma.crmApiKey.findMany({ orderBy: { createdAt: 'desc' } })
    return { keys: rows.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt, lastIp: k.lastIp, calls: k.calls, expiresAt: k.expiresAt, revokedAt: k.revokedAt })), scopes: SCOPES }
}

/** The key is returned once, here, and never again: only its SHA-256 is stored. */
export async function createKey(body = {}) {
    const session = await requireAdmin()
    const name = String(body.name || '').trim().slice(0, 80)
    if (!name) throw fail('Give the key a name (what will use it)')
    const scopes = [...new Set((Array.isArray(body.scopes) ? body.scopes : []).filter((s) => SCOPE_IDS.includes(s)))]
    if (!scopes.length) throw fail('Choose at least one thing the key may do')
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (expiresAt && (Number.isNaN(+expiresAt) || +expiresAt < Date.now())) throw fail('The expiry date must be in the future')
    const key = `trt_${crypto.randomBytes(30).toString('base64url')}`
    const row = await prisma.crmApiKey.create({ data: { name, prefix: key.slice(0, 11), hash: sha(key), scopes, createdBy: await getStaffId(session), expiresAt } })
    return { id: row.id, key, name, scopes }
}

export async function revokeKey(id) {
    await requireAdmin()
    if (!/^[a-f0-9]{24}$/i.test(String(id || ''))) throw fail('Key not found', 404)
    await prisma.crmApiKey.update({ where: { id }, data: { revokedAt: new Date() } }).catch(() => { throw fail('Key not found', 404) })
    return { success: true }
}

export async function keyLog(id) {
    await requireAdmin('view')
    if (!/^[a-f0-9]{24}$/i.test(String(id || ''))) throw fail('Key not found', 404)
    return { log: await prisma.crmApiLog.findMany({ where: { keyId: id }, orderBy: { createdAt: 'desc' }, take: 50 }) }
}

/**
 * Who is calling: the key in "Authorization: Bearer ..." (or X-API-Key). Throws 401 for a missing, unknown, revoked or expired key,
 * 429 when the key calls too fast (120 a minute), and 403 when it lacks the scope. Returns { key, log(status) }.
 */
export async function authenticate(request, scope) {
    const header = request.headers.get('authorization') || ''
    const raw = (header.startsWith('Bearer ') ? header.slice(7) : request.headers.get('x-api-key') || '').trim()
    if (!raw) throw fail('Send your API key as "Authorization: Bearer <key>"', 401)
    rateLimit(`apiip:${clientIp(request)}`, 600, 60000) // one address cannot hammer the check itself
    const key = await prisma.crmApiKey.findUnique({ where: { hash: sha(raw) } })
    if (!key || key.revokedAt || (key.expiresAt && +key.expiresAt < Date.now())) throw fail('This API key is not valid (unknown, revoked or expired)', 401)
    rateLimit(`apikey:${key.id}`, 120, 60000)
    if (scope && !key.scopes.includes(scope)) throw fail(`This key is not allowed to do this (it needs "${scope}")`, 403)
    const started = Date.now(), ip = clientIp(request)
    const log = (status) => {
        prisma.crmApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date(), lastIp: ip, calls: { increment: 1 } } }).catch(() => {})
        prisma.crmApiLog.create({ data: { keyId: key.id, method: request.method, path: new URL(request.url).pathname.slice(0, 200), status, ip, ms: Date.now() - started } }).catch(() => {})
    }
    return { key, log }
}
