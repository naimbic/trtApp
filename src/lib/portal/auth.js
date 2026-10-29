import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { lockState, recordFailure, clearFailures, rateLimited } from '@/lib/crm/loginGuard'
import { checkPassword } from '@/lib/crm/authTokens'
import { sendTemplate } from '@/lib/crm/mailer'
import { publicBase } from '@/lib/crm/shortLinks'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { requestIp } from '@/lib/crm/viewTracking'
import { sign } from '@/lib/portal/session'

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
const RESET_TTL = 60 * 60 * 1000
const INVITE_TTL = 7 * 24 * 3600 * 1000
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '')
/** Active contacts with this email, whatever the case and even if stray spaces were saved around the address (an exact filter would miss those). */
const contactsByEmail = async (e) => (await prisma.crmContact.findMany({ where: { email: { contains: e, mode: 'insensitive' }, active: true } })).filter((c) => String(c.email || '').trim().toLowerCase() === e)
const key = (e) => `portal:${String(e || '').trim().toLowerCase()}`

export async function portalLogin(email, password, request) {
    const e = String(email || '').trim().toLowerCase()
    if (!emailOk(e) || !password) throw httpError('Enter your email and password')
    const lock = await lockState(key(e))
    if (lock.locked) throw httpError(`Too many attempts. Try again in ${Math.ceil(lock.remainingMs / 60000)} minutes.`, 429)
    const contacts = await contactsByEmail(e)
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
    const c = (await contactsByEmail(e))[0]
    if (c) {
        const raw = await issueKey(c)
        await sendTemplate({ slug: 'contact-forgot-password', to: String(c.email).trim(), data: { reset_password_url: `${publicBase()}/portal/set-password?key=${raw}`, contact_email: c.email, contact_firstname: c.firstName || '', contact_lastname: c.lastName || '' }, relType: 'contact', relId: c.id })
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
    if (!emailOk(String(c.email || '').trim())) throw httpError('This contact has no valid email address')
    if (!c.active) throw httpError('This contact is inactive')
    const raw = await issueKey(c)
    const link = `${publicBase()}/portal/set-password?key=${raw}`
    const res = await sendTemplate({ slug: 'contact-set-password', to: String(c.email).trim(), data: { set_password_url: link, contact_email: c.email, contact_firstname: c.firstName || '', contact_lastname: c.lastName || '' }, relType: 'contact', relId: c.id })
    return { success: true, sent: !!res.sent, error: res.error || null, link: res.sent ? null : link, email: c.email, expires: c.passwordHash ? '1 hour' : '7 days' }
}

/** Staff set a contact's client-area password directly (no email). Signs the contact out everywhere. */
export async function setContactPassword(clientId, contactId, password) {
    const session = await requirePermission('customers', 'edit')
    if (!/^[a-f0-9]{24}$/i.test(String(contactId || '')) || !/^[a-f0-9]{24}$/i.test(String(clientId || ''))) throw httpError('Contact not found', 404)
    const c = await prisma.crmContact.findFirst({ where: { id: contactId, clientId } })
    if (!c) throw httpError('Contact not found', 404)
    if (!c.active) throw httpError('This contact is inactive')
    if (String(password || '').length < 8) throw httpError('The password needs at least 8 characters')
    await prisma.crmContact.update({ where: { id: c.id }, data: { passwordHash: await bcrypt.hash(String(password), 10), lastPasswordChange: new Date(), newPassKey: null, newPassKeyRequested: null, emailVerifiedAt: c.emailVerifiedAt || new Date() } })
    return { success: true, email: c.email }
}

/** Staff preview of the client area as one contact (no password). The cookie is read-only and lasts 2 hours. */
export async function previewAsContact(clientId, contactId) {
    await requirePermission('customers', 'edit')
    if (!/^[a-f0-9]{24}$/i.test(String(contactId || '')) || !/^[a-f0-9]{24}$/i.test(String(clientId || ''))) throw httpError('Contact not found', 404)
    const c = await prisma.crmContact.findFirst({ where: { id: contactId, clientId } })
    if (!c) throw httpError('Contact not found', 404)
    if (!c.active) throw httpError('This contact is inactive')
    try { await prisma.crmActivityLog.create({ data: { description: `Opened the client area as ${[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email} (login as)`, staffId: await getStaffId(session) } }) } catch { /* auditing must never break the preview */ }
    return { value: sign(c, { preview: true }), name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email }
}

/** For the client page: can each contact sign in to the client area right now, and if not, why (the same checks as the sign-in). */
export async function portalAccess(client, contacts) {
    const locks = await prisma.loginAttempt.findMany({ where: { key: { in: contacts.map((c) => key(c.email)) } } })
    const lockOf = Object.fromEntries(locks.map((l) => [l.key, l]))
    return Object.fromEntries(contacts.map((c) => {
        const reasons = []
        if (client?.active !== true) reasons.push('The client is not active')
        if (c.active !== true) reasons.push('The contact is not active')
        if (!emailOk(String(c.email || '').trim())) reasons.push('The contact has no valid email address')
        if (!c.passwordHash) reasons.push('No client area password yet')
        const l = lockOf[key(c.email)]
        const locked = !!(l?.lockedUntil && l.lockedUntil > new Date())
        if (locked) reasons.push('Locked after too many wrong passwords')
        return [c.id, { ok: !reasons.length, reasons, locked, lockedUntil: locked ? l.lockedUntil : null, failures: l?.count || 0 }]
    }))
}

/** Staff: clear the "too many attempts" lock of a contact. */
export async function unlockContact(clientId, contactId) {
    await requirePermission('customers', 'edit')
    if (!/^[a-f0-9]{24}$/i.test(String(contactId || '')) || !/^[a-f0-9]{24}$/i.test(String(clientId || ''))) throw httpError('Contact not found', 404)
    const c = await prisma.crmContact.findFirst({ where: { id: contactId, clientId } })
    if (!c) throw httpError('Contact not found', 404)
    await clearFailures(key(c.email))
    return { success: true }
}
