import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { clearFailures } from '@/lib/crm/loginGuard'

const RESET_TTL = 60 * 60 * 1000 // 1 hour
const INVITE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex')
const httpError = (message, status = 400) => Object.assign(new Error(message), { status })

export const PASSWORD_MIN = 8
export function checkPassword(pw) {
    if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) throw httpError(`Password must be at least ${PASSWORD_MIN} characters`)
    if (pw.length > 200) throw httpError('Password is too long')
    return pw
}

/** Creates a one-time link token (older unused ones of the same user are revoked). Returns { token, expiresAt }. */
export async function createAuthToken(userId, purpose = 'reset', createdBy) {
    await prisma.authToken.updateMany({ where: { userId }, data: { usedAt: new Date() } })
    const token = crypto.randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + (purpose === 'invite' ? INVITE_TTL : RESET_TTL))
    await prisma.authToken.create({ data: { userId, tokenHash: hash(token), purpose, expiresAt, usedAt: null, createdBy: createdBy || undefined } })
    return { token, expiresAt }
}

const maskEmail = (e = '') => e.replace(/^(.).*(@.*)$/, (_, a, d) => `${a}•••${d}`)

/** { valid, purpose?, email? } without consuming the token. */
export async function inspectToken(raw) {
    if (!raw) return { valid: false }
    const row = await prisma.authToken.findUnique({ where: { tokenHash: hash(String(raw)) } })
    if (!row || row.usedAt || row.expiresAt < new Date()) return { valid: false }
    const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { email: true } })
    if (!user) return { valid: false }
    return { valid: true, purpose: row.purpose, email: maskEmail(user.email), expiresAt: row.expiresAt }
}

/** Sets a new password from a token, signs out every existing session and clears the sign-in lock. */
export async function resetPasswordWithToken(raw, password) {
    checkPassword(password)
    const row = raw ? await prisma.authToken.findUnique({ where: { tokenHash: hash(String(raw)) } }) : null
    if (!row || row.usedAt || row.expiresAt < new Date()) throw httpError('This link is invalid or has expired', 400)
    const user = await prisma.user.findUnique({ where: { id: row.userId } })
    if (!user) throw httpError('This link is invalid or has expired', 400)
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 10), sessionVersion: (user.sessionVersion || 0) + 1 } })
    await prisma.authToken.updateMany({ where: { userId: user.id }, data: { usedAt: new Date() } })
    await prisma.crmStaff.updateMany({ where: { userId: user.id }, data: { lastPasswordChange: new Date() } })
    await clearFailures(user.email)
    return { success: true, email: user.email }
}

/** Invalidate every session of a user (they must sign in again). */
export async function signOutEverywhere(userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } })
    if (!u) throw httpError('User not found', 404)
    await prisma.user.update({ where: { id: userId }, data: { sessionVersion: (u.sessionVersion || 0) + 1 } })
    return { success: true }
}
