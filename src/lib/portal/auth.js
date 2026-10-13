import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { lockState, recordFailure, clearFailures, rateLimited } from '@/lib/crm/loginGuard'
import { checkPassword } from '@/lib/crm/authTokens'
import { sendTemplate } from '@/lib/crm/mailer'
import { publicBase } from '@/lib/crm/shortLinks'
import { requirePermission } from '@/lib/crm/permissions'
import { requestIp } from '@/lib/crm/viewTracking'
import { sign } from '@/lib/portal/session'

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
const RESET_TTL = 60 * 60 * 1000
const INVITE_TTL = 7 * 24 * 3600 * 1000
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '')
const key = (e) => `portal:${String(e || '').trim().toLowerCase()}`

export async function portalLogin(email, password, request) {
    const e = String(email || '').trim().toLowerCase()
    if (!emailOk(e) || !password) throw httpError('Enter your email and password')
    const lock = await lockState(key(e))
    if (lock.locked) throw httpError(`Too many attempts. Try again in ${Math.ceil(lock.remainingMs / 60000)} minutes.`, 429)
    const contacts = await prisma.crmContact.findMany({ where: { email: { equals: e, mode: 'insensitive' }, active: true } })
    let hit = null
    for (const c of contacts) if (c.passwordHash && (await bcrypt.compare(String(password), c.passwordHash))) { hit = c; break }
    const client = hit ? await prisma.crmClient.findUnique({ where: { id: hit.clientId }, select: { active: true } }) : null
    if (!hit || !client?.active) { await recordFailure(key(e), requestIp(request)); throw httpError('Wrong email or password', 401) }
    await clearFailures(key(e))
    await prisma.crmContact.update({ where: { id: hit.id }, data: { lastLogin: new Date(), lastIp: requestIp(request) } })
    return { value: sign(hit), contact: hit }
}

/** One-time link key (stored hashed). Valid 1 hour for an existing password, 7 days for a first-time invitation. */
async function issueKey(contact) {
    const raw = crypto.randomBytes(32).toString('base64url')
    await prisma.crmContact.update({ where: { id: contact.id }, data: { newPassKey: sha(raw), newPassKeyRequested: new Date() } })
    return raw
}

export async function requestReset(email) {
    const e = String(email || '').trim().toLowerCase()
    if (!emailOk(e)) throw httpError('Enter a valid email address')
    if (await rateLimited('portal-reset', e, 3, 60 * 60 * 1000)) return { success: true } // same answer, no hint
    const c = await prisma.crmContact.findFirst({ where: { email: { equals: e, mode: 'insensitive' }, active: true } })
    if (c) {
        const raw = await issueKey(c)
        await sendTemplate({ slug: 'contact-forgot-password', to: c.email, data: { reset_password_url: `${publicBase()}/portal/set-password?key=${raw}`, contact_email: c.email, contact_firstname: c.firstName || '', contact_lastname: c.lastName || '' }, relType: 'contact', relId: c.id })
    }
    return { success: true }
}

async function byKey(raw) {
    if (!raw) return null
    const c = await prisma.crmContact.findFirst({ where: { newPassKey: sha(String(raw)) } })
    if (!c || !c.newPassKeyRequested) return null
    const ttl = c.passwordHash ? RESET_TTL : INVITE_TTL
    return +new Date(c.newPassKeyRequested) + ttl > Date.now() ? c : null
}

export async function inspectKey(raw) {
    const c = await byKey(raw)
    return c ? { valid: true, email: c.email, name: [c.firstName, c.lastName].filter(Boolean).join(' '), first: !c.passwordHash } : { valid: false }
}

export async function setPasswordWithKey(raw, password) {
    const c = await byKey(raw)
    if (!c) throw httpError('This link is no longer valid. Ask for a new one.', 400)
    checkPassword(password)
    const updated = await prisma.crmContact.update({ where: { id: c.id }, data: { passwordHash: await bcrypt.hash(password, 10), lastPasswordChange: new Date(), newPassKey: null, newPassKeyRequested: null, emailVerifiedAt: c.emailVerifiedAt || new Date() } })
    await clearFailures(key(c.email))
    return { value: sign(updated), contact: updated, first: !c.passwordHash }
}

export async function changePassword(contact, current, next) {
    if (!contact.passwordHash || !(await bcrypt.compare(String(current || ''), contact.passwordHash))) throw httpError('Your current password is not right', 400)
    checkPassword(next)
    const updated = await prisma.crmContact.update({ where: { id: contact.id }, data: { passwordHash: await bcrypt.hash(next, 10), lastPasswordChange: new Date() } })
    return { value: sign(updated) }
}

/** Staff: email the contact a link to set a password (also usable as "reset"). Returns the link when the email could not be sent. */
export async function inviteContact(clientId, contactId) {
    await requirePermission('customers', 'edit')
    const c = await prisma.crmContact.findFirst({ where: { id: contactId, clientId } })
    if (!c) throw httpError('Contact not found', 404)
    if (!emailOk(c.email)) throw httpError('This contact has no valid email address')
    if (!c.active) throw httpError('This contact is inactive')
    const raw = await issueKey(c)
    const link = `${publicBase()}/portal/set-password?key=${raw}`
    const res = await sendTemplate({ slug: 'contact-set-password', to: c.email, data: { set_password_url: link, contact_email: c.email, contact_firstname: c.firstName || '', contact_lastname: c.lastName || '' }, relType: 'contact', relId: c.id })
    return { success: true, sent: !!res.sent, error: res.error || null, link: res.sent ? null : link, email: c.email, expires: c.passwordHash ? '1 hour' : '7 days' }
}
