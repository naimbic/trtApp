import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import validateCredential from '@/server/actions/user/validateCredential'
import { buildUserAuthority } from '@/lib/crm/authBuild'
import { lockState } from '@/lib/crm/loginGuard'
import { twoFactorStatus } from '@/lib/crm/twoFactor'

/**
 * TEMPORARY sign-in diagnostic. Disabled unless SIGNIN_DIAG_TOKEN is set on the server. POST { email } with header
 * x-diag-token. Reports why the sign-in check fails for that account (never returns a password or a hash). It runs the
 * real sign-in check with a throwaway password: the stored hash is swapped for a moment and always restored.
 */
export async function POST(request) {
    const token = process.env.SIGNIN_DIAG_TOKEN
    if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const given = request.headers.get('x-diag-token') || ''
    const ok = given.length === token.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { email: raw } = await request.json().catch(() => ({}))
    const email = String(raw || '').trim().toLowerCase()
    const out = { email }
    const step = async (name, fn) => { try { out[name] = await fn() } catch (e) { out[name] = { threw: String(e?.message || e).slice(0, 300) } } }

    await step('users', async () => (await prisma.user.findMany({ where: { email: { equals: email, mode: 'insensitive' } } })).map((u) => ({
        id: u.id, emailExact: u.email === email, role: u.role, authority: u.authority, status: u.status, sessionVersion: u.sessionVersion ?? null,
        hash: u.password ? `${u.password.slice(0, 4)} len ${u.password.length}` : 'none',
    })))
    await step('staff', async () => (await prisma.crmStaff.findMany({ where: { email: { equals: email, mode: 'insensitive' } }, include: { role: true, permissions: true } })).map((s) => ({
        id: s.id, userId: s.userId, active: s.active, admin: s.admin, role: s.role?.name || null, permissions: s.permissions.length,
    })))
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    if (user) {
        await step('roleRow', async () => { const r = await prisma.role.findUnique({ where: { roleId: user.role || 'user' } }); return r ? { found: true, accessRightType: typeof r.accessRight } : { found: false } })
        await step('authority', async () => { const r = await buildUserAuthority(user); return { blocked: r.blocked, count: r.authority.length } })
        await step('twoFactor', async () => twoFactorStatus(user.id))
        await step('lock', async () => lockState(email))
        // the real sign-in check with a throwaway password
        await step('signInCheck', async () => {
            const original = user.password
            const tmp = crypto.randomBytes(12).toString('base64url')
            await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(tmp, 10) } })
            try {
                const r = await validateCredential({ email, password: tmp })
                return r ? { result: 'accepted', authority: r.authority.length } : { result: 'rejected (returned null)' }
            } finally {
                await prisma.user.update({ where: { id: user.id }, data: { password: original } })
            }
        })
    }
    return NextResponse.json(out)
}
