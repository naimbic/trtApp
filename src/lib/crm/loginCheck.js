import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { lockState, recordFailure } from '@/lib/crm/loginGuard'
import { buildUserAuthority } from '@/lib/crm/authBuild'

const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.4Q0n5y7Q5xk9bP7r6bUQ8g8m3m5W'
const ip = async () => { try { const h = await headers(); return (h.get('x-forwarded-for') || '').split(',')[0].trim() || null } catch { return null } }

/** Checks email + password for the first step of a sign-in without creating a session. */
export async function verifyLogin(emailRaw, password) {
    const email = String(emailRaw || '').trim().toLowerCase()
    if (!email || !password) return { user: null }
    const lock = await lockState(email)
    if (lock.locked) return { user: null, locked: true, minutes: Math.max(1, Math.ceil(lock.remainingMs / 60000)) }
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    const ok = await bcrypt.compare(String(password), user?.password || DUMMY_HASH)
    if (!user || !user.password || !ok) { await recordFailure(email, await ip()); return { user: null } }
    const { blocked } = await buildUserAuthority(user)
    if (blocked) return { user: null }
    return { user }
}
