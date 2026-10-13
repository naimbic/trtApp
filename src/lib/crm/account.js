import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { createAuthToken, checkPassword, signOutEverywhere } from '@/lib/crm/authTokens'
import { rateLimited } from '@/lib/crm/loginGuard'
import { sendMail, isMailConfigured } from '@/lib/mail'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })

/** Public base URL of the web app (used in emailed links). */
export const webBaseUrl = (request) => process.env.APP_WEB_URL || request?.headers?.get('origin') || 'http://localhost:3200'

async function currentUserId() {
    const session = await auth()
    if (!session?.user?.id) throw httpError('Unauthorized', 401)
    return session.user.id
}

/**
 * "Forgot password": always answers the same way so it cannot be used to discover which emails exist.
 * With SMTP configured the reset link is emailed; otherwise an administrator can create the link from the Team screen.
 */
export async function requestPasswordReset(email, request) {
    const clean = String(email || '').trim().toLowerCase()
    const response = { ok: true, mailConfigured: isMailConfigured() }
    if (!clean || (await rateLimited('forgot', clean, 5, 60 * 60 * 1000))) return response
    const user = await prisma.user.findFirst({ where: { email: { equals: clean, mode: 'insensitive' } } })
    if (!user) return response
    const staff = await prisma.crmStaff.findFirst({ where: { userId: user.id } })
    if (staff && !staff.active) return response
    const { token } = await createAuthToken(user.id, 'reset')
    const link = `${webBaseUrl(request)}/reset-password?token=${token}`
    if (isMailConfigured()) {
        try {
            await sendMail({
                to: user.email,
                subject: 'Reset your password',
                text: `Hello ${user.name || ''},\n\nUse this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
                html: `<p>Hello ${user.name || ''},</p><p><a href="${link}">Choose a new password</a> (link valid for 1 hour).</p><p>If you did not ask for this, you can ignore this email.</p>`,
            })
        } catch (e) {
            console.error('[auth] reset email failed:', e.message)
        }
    }
    return response
}

export async function changeOwnPassword({ currentPassword, newPassword }) {
    const id = await currentUserId()
    checkPassword(newPassword)
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user?.password || !(await bcrypt.compare(String(currentPassword || ''), user.password))) throw httpError('Your current password is incorrect', 400)
    if (await bcrypt.compare(newPassword, user.password)) throw httpError('Choose a password different from the current one', 400)
    await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(newPassword, 10), sessionVersion: (user.sessionVersion || 0) + 1 } })
    await prisma.crmStaff.updateMany({ where: { userId: id }, data: { lastPasswordChange: new Date() } })
    return { success: true, signOut: true }
}

export async function signOutOwnDevices() {
    return signOutEverywhere(await currentUserId())
}
