import prisma from '@/lib/prisma'

export const MAX_ATTEMPTS = 5
export const WINDOW_MS = 15 * 60 * 1000
export const LOCK_MS = 15 * 60 * 1000

const keyOf = (email) => String(email || '').trim().toLowerCase()

/** { locked, until, remainingMs } for an email. Never reveals whether the account exists. */
export async function lockState(email) {
    const row = await prisma.loginAttempt.findUnique({ where: { key: keyOf(email) } })
    if (row?.lockedUntil && row.lockedUntil > new Date()) return { locked: true, until: row.lockedUntil, remainingMs: row.lockedUntil - Date.now() }
    return { locked: false }
}

export async function recordFailure(email, ip) {
    const key = keyOf(email)
    if (!key) return
    const now = new Date()
    const row = await prisma.loginAttempt.findUnique({ where: { key } })
    const fresh = !row || now - row.firstAt > WINDOW_MS || (row.lockedUntil && row.lockedUntil <= now)
    const count = fresh ? 1 : row.count + 1
    const data = { count, firstAt: fresh ? now : row.firstAt, lastIp: ip || null, lockedUntil: count >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCK_MS) : null }
    await prisma.loginAttempt.upsert({ where: { key }, create: { key, ...data }, update: data })
}

export async function clearFailures(email) {
    await prisma.loginAttempt.deleteMany({ where: { key: keyOf(email) } })
}

/** Small sliding counter reused for "forgot password" requests (key prefix keeps them separate). */
export async function rateLimited(scope, id, max, windowMs) {
    const key = `${scope}:${keyOf(id)}`
    const now = new Date()
    const row = await prisma.loginAttempt.findUnique({ where: { key } })
    const fresh = !row || now - row.firstAt > windowMs
    const count = fresh ? 1 : row.count + 1
    await prisma.loginAttempt.upsert({ where: { key }, create: { key, count, firstAt: now }, update: { count, firstAt: fresh ? now : row.firstAt } })
    return count > max
}
