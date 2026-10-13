import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import prisma from '@/lib/prisma'
import { rateLimited } from '@/lib/crm/loginGuard'
import { getOptions, buildHtml, deliver, findTemplate, companyLanguage, mergeFields, baseData } from '@/lib/crm/mailer'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')

/* ---------- secret storage: AES-256-GCM, key derived from the auth secret ---------- */
const key = () => crypto.createHash('sha256').update(`2fa:${process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-only-secret'}`).digest()
export function seal(text) {
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key(), iv)
    const enc = Buffer.concat([c.update(text, 'utf8'), c.final()])
    return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64')
}
export function unseal(blob) {
    const b = Buffer.from(blob, 'base64')
    const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12))
    d.setAuthTag(b.subarray(12, 28))
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')
}

/* ---------- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export const b32encode = (buf) => { let bits = 0, v = 0, out = ''; for (const byte of buf) { v = (v << 8) | byte; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5 } } if (bits) out += B32[(v << (5 - bits)) & 31]; return out }
export const b32decode = (s) => { let bits = 0, v = 0; const out = []; for (const ch of s.replace(/[\s=]/g, '').toUpperCase()) { const i = B32.indexOf(ch); if (i < 0) continue; v = (v << 5) | i; bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8 } } return Buffer.from(out) }
const hotp = (secret, counter) => {
    const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter))
    const h = crypto.createHmac('sha1', secret).update(buf).digest()
    const o = h[h.length - 1] & 15
    return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, '0')
}
/** Returns the accepted step (to remember it) or null. Allows one step of clock drift either way. */
export function checkTotp(secretB32, code, afterStep = -1) {
    if (!/^\d{6}$/.test(code || '')) return null
    const now = Math.floor(Date.now() / 30000)
    const secret = b32decode(secretB32)
    for (const step of [now, now - 1, now + 1]) {
        if (step > afterStep && crypto.timingSafeEqual(Buffer.from(hotp(secret, step)), Buffer.from(code))) return step
    }
    return null
}

/* ---------- recovery codes ---------- */
const makeCodes = () => Array.from({ length: 8 }, () => { const r = crypto.randomBytes(5).toString('hex'); return `${r.slice(0, 5)}-${r.slice(5)}` })
const normCode = (c) => String(c || '').trim().toLowerCase().replace(/\s/g, '')

async function row(userId) {
    return prisma.crmTwoFactor.findUnique({ where: { userId } })
}
async function ensureRow(userId) {
    return (await row(userId)) || prisma.crmTwoFactor.create({ data: { userId, totpEnabled: false, emailEnabled: false, recoveryHashes: [] } })
}

export async function twoFactorStatus(userId) {
    const r = await row(userId)
    return { app: !!r?.totpEnabled, email: !!r?.emailEnabled, recoveryLeft: r?.recoveryHashes?.length || 0, enabled: !!(r?.totpEnabled || r?.emailEnabled) }
}
export const hasTwoFactor = async (userId) => (await twoFactorStatus(userId)).enabled

async function checkPassword(userId, password) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
    if (!u?.password || !(await bcrypt.compare(String(password || ''), u.password))) throw httpError('Your password is not correct', 400)
}

async function syncStaffFlag(userId) {
    const on = (await twoFactorStatus(userId)).enabled
    await prisma.crmStaff.updateMany({ where: { userId }, data: { twoFactorAuthEnabled: on } })
}

/* ---------- authenticator app ---------- */
export async function beginApp(userId, email) {
    const secret = b32encode(crypto.randomBytes(20))
    const r = await ensureRow(userId)
    await prisma.crmTwoFactor.update({ where: { id: r.id }, data: { totpPendingEnc: seal(secret) } })
    const issuer = ((await getOptions(['companyname']))('companyname') || 'trtCRM').replace(/[:]/g, ' ')
    const url = `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
    return { secret: secret.match(/.{1,4}/g).join(' '), otpauthUrl: url, qr: await QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: 'M' }) }
}

async function giveRecoveryIfNone(r) {
    if (r.recoveryHashes?.length) return null
    const codes = makeCodes()
    await prisma.crmTwoFactor.update({ where: { id: r.id }, data: { recoveryHashes: codes.map((c) => sha(normCode(c))) } })
    return codes
}

export async function enableApp(userId, code) {
    const r = await row(userId)
    if (!r?.totpPendingEnc) throw httpError('Start the set-up again')
    if (await rateLimited('2fa-setup', userId, 8, 10 * 60 * 1000)) throw httpError('Too many attempts, wait a few minutes', 429)
    const secret = unseal(r.totpPendingEnc)
    const step = checkTotp(secret, normCode(code))
    if (step === null) throw httpError('That code is not right. Check the code in your app and try again.')
    await prisma.crmTwoFactor.update({ where: { id: r.id }, data: { totpSecretEnc: seal(secret), totpPendingEnc: null, totpEnabled: true, lastStep: step } })
    const recoveryCodes = await giveRecoveryIfNone(await row(userId))
    await syncStaffFlag(userId)
    return { success: true, recoveryCodes }
}

export async function disableApp(userId, password) {
    await checkPassword(userId, password)
    const r = await ensureRow(userId)
    await prisma.crmTwoFactor.update({ where: { id: r.id }, data: { totpEnabled: false, totpSecretEnc: null, totpPendingEnc: null, lastStep: null, ...(r.emailEnabled ? {} : { recoveryHashes: [] }) } })
    await syncStaffFlag(userId)
    return { success: true }
}

/* ---------- email code ---------- */
const maskEmail = (e = '') => e.replace(/^(.).*(@.*)$/, (_, a, d) => `${a}•••${d}`)
const OTP_TTL = 10 * 60 * 1000

async function sendCode(user, purpose) {
    if (await rateLimited('2fa-email', user.id, 5, 15 * 60 * 1000)) throw httpError('Too many codes requested, wait a few minutes', 429)
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    await prisma.authToken.updateMany({ where: { userId: user.id, purpose: 'email-otp', usedAt: null }, data: { usedAt: new Date() } })
    await prisma.authToken.create({ data: { userId: user.id, tokenHash: sha(`${user.id}:${code}`), purpose: 'email-otp', expiresAt: new Date(Date.now() + OTP_TTL), usedAt: null } })
    const first = (user.name || '').split(' ')[0]
    const lang = await companyLanguage()
    const t = await findTemplate('two-factor-authentication', lang)
    const data = { ...(await baseData()), two_factor_auth_code: code, staff_firstname: first }
    const html = t && t.active !== false
        ? await buildHtml(t.message, data)
        : await buildHtml(`<h2 style="font-family:Arial,sans-serif">Your verification code</h2><p style="font-family:Arial,sans-serif">Use this code to ${purpose === 'setup' ? 'turn on' : 'finish signing in with'} two-step verification. It expires in 10 minutes.</p><p style="font-family:monospace;font-size:30px;letter-spacing:8px;font-weight:700">${code}</p>`, data)
    const res = await deliver({ to: user.email, subject: t ? mergeFields(t.subject, data) : 'Your verification code', html })
    if (!res.sent) throw httpError(`We could not send the email: ${res.error}`, 502)
    return { sent: true, to: maskEmail(user.email) }
}
async function consumeEmailCode(userId, code) {
    if (!/^\d{6}$/.test(code || '')) return false
    const t = await prisma.authToken.findUnique({ where: { tokenHash: sha(`${userId}:${code}`) } })
    if (!t || t.usedAt || t.purpose !== 'email-otp' || t.expiresAt < new Date()) return false
    const r = await prisma.authToken.updateMany({ where: { id: t.id, usedAt: null }, data: { usedAt: new Date() } })
    return r.count === 1
}

export async function sendEmailSetupCode(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.email) throw httpError('No email address on your account')
    return sendCode(user, 'setup')
}
export async function enableEmail(userId, code) {
    if (await rateLimited('2fa-setup', userId, 8, 10 * 60 * 1000)) throw httpError('Too many attempts, wait a few minutes', 429)
    if (!(await consumeEmailCode(userId, normCode(code)))) throw httpError('That code is not right or has expired')
    const r = await ensureRow(userId)
    await prisma.crmTwoFactor.update({ where: { id: r.id }, data: { emailEnabled: true } })
    const recoveryCodes = await giveRecoveryIfNone(await row(userId))
    await syncStaffFlag(userId)
    return { success: true, recoveryCodes }
}
export async function disableEmail(userId, password) {
    await checkPassword(userId, password)
    const r = await ensureRow(userId)
    await prisma.crmTwoFactor.update({ where: { id: r.id }, data: { emailEnabled: false, ...(r.totpEnabled ? {} : { recoveryHashes: [] }) } })
    await syncStaffFlag(userId)
    return { success: true }
}
export async function regenerateRecovery(userId, password) {
    await checkPassword(userId, password)
    const r = await row(userId)
    if (!r || !(r.totpEnabled || r.emailEnabled)) throw httpError('Turn on two-step verification first')
    const codes = makeCodes()
    await prisma.crmTwoFactor.update({ where: { id: r.id }, data: { recoveryHashes: codes.map((c) => sha(normCode(c))) } })
    return { recoveryCodes: codes }
}

/** An administrator removes all two-step methods of a user (lost phone). */
export async function resetTwoFactor(userId) {
    await prisma.crmTwoFactor.deleteMany({ where: { userId } })
    await syncStaffFlag(userId)
    return { success: true }
}

/* ---------- sign-in ---------- */
/** Emails a sign-in code (only call after the password was verified). */
export async function sendLoginEmailCode(user) {
    const s = await twoFactorStatus(user.id)
    if (!s.email) throw httpError('Email codes are not turned on for this account')
    return sendCode(user, 'login')
}

/** Verifies the second step: authenticator code, email code or a recovery code. */
export async function verifySecondStep(userId, input) {
    const code = normCode(input)
    if (!code) return false
    const r = await row(userId)
    if (!r) return true
    if (/^\d{6}$/.test(code)) {
        if (r.totpEnabled && r.totpSecretEnc) {
            const step = checkTotp(unseal(r.totpSecretEnc), code, r.lastStep ?? -1)
            if (step !== null) { await prisma.crmTwoFactor.update({ where: { id: r.id }, data: { lastStep: step } }); return true }
        }
        if (r.emailEnabled && (await consumeEmailCode(userId, code))) return true
        return false
    }
    const h = sha(code)
    if (r.recoveryHashes?.includes(h)) {
        const upd = await prisma.crmTwoFactor.updateMany({ where: { id: r.id, recoveryHashes: { has: h } }, data: { recoveryHashes: r.recoveryHashes.filter((x) => x !== h) } })
        return upd.count === 1
    }
    return false
}
