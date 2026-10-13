'use server'
import { headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { buildUserAuthority } from '@/lib/crm/authBuild'
import { lockState, recordFailure, clearFailures } from '@/lib/crm/loginGuard'
import { hasTwoFactor, verifySecondStep } from '@/lib/crm/twoFactor'

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.4Q0n5y7Q5xk9bP7r6bUQ8g8m3m5W'

const clientIp = async () => {
    try {
        const h = await headers()
        return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || null
    } catch {
        return null
    }
}

/**
 * Credentials check used by NextAuth. Applies the failed-attempt lock, blocks inactive team members and
 * records the sign-in. Returns null on any failure (the UI asks /api/crm/auth/status why).
 */
const validateCredential = async (values) => {
    const email = String(values?.email || '').trim().toLowerCase()
    const password = String(values?.password || '')
    if (!email || !password) return null

    if ((await lockState(email)).locked) return null

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH)
    if (!user || !user.password || !ok) {
        await recordFailure(email, await clientIp())
        return null
    }

    const { authority, blocked } = await buildUserAuthority(user)
    if (blocked) return null // inactive team member

    // two-step verification: the code must come with the password (the sign-in form asks for it as a second step)
    if (await hasTwoFactor(user.id)) {
        const otp = String(values?.otp || '').trim()
        if (!otp) return null
        if (!(await verifySecondStep(user.id, otp))) {
            await recordFailure(email, await clientIp()) // codes are brute-force protected by the same lock
            return null
        }
    }
    await clearFailures(email)

    // team members: remember when they last signed in
    prisma.crmStaff.updateMany({ where: { userId: user.id }, data: { lastLogin: new Date(), lastActivity: new Date() } }).catch(() => {})

    return { id: user.id, userName: user.name, email: user.email, avatar: user.image, authority, sv: user.sessionVersion || 0 }
}

export default validateCredential
