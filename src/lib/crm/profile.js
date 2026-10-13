import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { PermissionError, requirePermission, isCrmAdmin, getStaffId, hasCap } from '@/lib/crm/permissions'
import { clearFailures } from '@/lib/crm/loginGuard'
import { deliver, buildHtml, baseData } from '@/lib/crm/mailer'
import { uploadImage, deleteMedia, keyFromUrl, MediaError } from '@/lib/media'

const plain = (v) => JSON.parse(JSON.stringify(v))
const fail = (message, status = 400) => { throw new PermissionError(message, status) }
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max)
/** Only pictures we stored (https://…) count; the old template placeholders (/img/avatars/…) mean "no picture". */
export const realPicture = (u) => (/^https?:\/\//i.test(u || '') ? u : null)
const URL_RE = /^https?:\/\/[^\s]+$/i

export const DEFAULT_PREFS = {
    notify: { invoicePaid: true, taskAssigned: true, ticketReply: true, eventReminder: true, dailyDigest: false, desktop: true },
    display: { theme: 'system', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', weekStart: 1, landing: '/dashboard' },
}
const THEMES = ['light', 'dark', 'system'], DATES = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], TIMES = ['24h', '12h'], WEEK = [0, 1, 6]
const LANDINGS = ['/dashboard', '/calendar', '/crm/invoices', '/crm/clients', '/crm/contracts', '/crm/tasks-board']

function mergePrefs(raw) {
    let saved = {}
    try { saved = raw ? JSON.parse(raw) : {} } catch { /* ignore broken JSON */ }
    return { notify: { ...DEFAULT_PREFS.notify, ...(saved.notify || {}) }, display: { ...DEFAULT_PREFS.display, ...(saved.display || {}) } }
}

async function me() {
    const session = await auth()
    if (!session?.user?.id) throw new PermissionError('Unauthorized', 401)
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) throw new PermissionError('Unauthorized', 401)
    const staff = await prisma.crmStaff.findFirst({ where: { userId: user.id }, include: { role: true, departments: true } })
    return { session, user, staff }
}

export async function getProfile() {
    const { session, user, staff } = await me()
    const deptIds = (staff?.departments || []).map((d) => d.departmentId)
    const departments = deptIds.length ? await prisma.crmDepartment.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } }) : []
    return plain({
        user: {
            id: user.id, email: user.email, image: realPicture(user.image), firstName: user.firstName || staff?.firstName || '', lastName: user.lastName || staff?.lastName || '',
            title: staff?.jobTitle || user.title || '', phone: user.phone || staff?.phoneNumber || '', dialCode: user.dialCode || '', country: user.country || '', address: user.address || '',
            city: user.city || '', postcode: user.postcode || '', birthday: user.birthday || '', createdAt: user.createdAt,
        },
        staff: staff ? {
            id: staff.id, facebook: staff.facebook || '', linkedin: staff.linkedin || '', skype: staff.skype || '', whatsapp: staff.whatsapp || '', website: staff.website || '',
            bio: staff.bio || '', timezone: staff.timezone || '', defaultLanguage: staff.defaultLanguage || '', direction: staff.direction || 'ltr', emailSignature: staff.emailSignature || '',
            role: staff.role?.name || null, lastLogin: staff.lastLogin, departments,
        } : null,
        admin: isCrmAdmin(session.user.authority || []),
        canChangeEmail: hasCap(session.user.authority || [], 'profile', 'change_email'),
        preferences: mergePrefs(staff?.preferences),
    })
}

const TIMEZONES = new Set(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [])

export async function updateProfile(body) {
    const { user, staff } = await me()
    const u = body.user || {}, s = body.staff || {}
    const userData = {}, staffData = {}

    if ('firstName' in u || 'lastName' in u) {
        const firstName = clean(u.firstName ?? user.firstName, 60), lastName = clean(u.lastName ?? user.lastName, 60)
        if (!firstName) fail('First name is required')
        Object.assign(userData, { firstName, lastName, name: `${firstName} ${lastName}`.trim() })
        Object.assign(staffData, { firstName, lastName })
    }
    if ('phone' in u) { const v = clean(u.phone, 25); if (v && !/^[0-9 +().-]{5,25}$/.test(v)) fail('Enter a valid phone number'); Object.assign(userData, { phone: v || null }); staffData.phoneNumber = v || null }
    if ('dialCode' in u) userData.dialCode = clean(u.dialCode, 8) || null
    for (const k of ['title', 'country', 'address', 'city', 'postcode']) if (k in u) userData[k] = clean(u[k], k === 'address' ? 200 : 80) || null
    if ('title' in u) staffData.jobTitle = userData.title
    if ('birthday' in u) {
        const v = clean(u.birthday, 10)
        if (v) { const d = new Date(v); if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(+d) || d > new Date()) fail('Enter a valid birthday'); }
        userData.birthday = v || null
    }
    for (const k of ['facebook', 'linkedin', 'website']) if (k in s) { const v = clean(s[k], 200); if (v && !URL_RE.test(v)) fail(`${k[0].toUpperCase() + k.slice(1)} must be a full link starting with https://`); staffData[k] = v || null }
    if ('skype' in s) staffData.skype = clean(s.skype, 80) || null
    if ('whatsapp' in s) { const v = clean(s.whatsapp, 25); if (v && !/^[0-9 +().-]{5,25}$/.test(v)) fail('Enter a valid WhatsApp number'); staffData.whatsapp = v || null }
    if ('bio' in s) staffData.bio = clean(s.bio, 500) || null
    if ('timezone' in s) { const v = clean(s.timezone, 60); if (v && TIMEZONES.size && !TIMEZONES.has(v)) fail('Unknown time zone'); staffData.timezone = v || null }
    if ('defaultLanguage' in s) staffData.defaultLanguage = clean(s.defaultLanguage, 30) || null
    if ('direction' in s) staffData.direction = s.direction === 'rtl' ? 'rtl' : 'ltr'
    if ('emailSignature' in s) staffData.emailSignature = clean(s.emailSignature, 2000) || null

    if (body.preferences) {
        const cur = mergePrefs(staff?.preferences), n = body.preferences.notify || {}, d = body.preferences.display || {}
        const next = { notify: { ...cur.notify }, display: { ...cur.display } }
        for (const k of Object.keys(DEFAULT_PREFS.notify)) if (k in n) next.notify[k] = !!n[k]
        if (THEMES.includes(d.theme)) next.display.theme = d.theme
        if (DATES.includes(d.dateFormat)) next.display.dateFormat = d.dateFormat
        if (TIMES.includes(d.timeFormat)) next.display.timeFormat = d.timeFormat
        if (WEEK.includes(Number(d.weekStart))) next.display.weekStart = Number(d.weekStart)
        if (LANDINGS.includes(d.landing)) next.display.landing = d.landing
        staffData.preferences = JSON.stringify(next)
    }

    if (Object.keys(userData).length) await prisma.user.update({ where: { id: user.id }, data: userData })
    if (staff && Object.keys(staffData).length) await prisma.crmStaff.update({ where: { id: staff.id }, data: staffData })
    return getProfile()
}

/** Replaces the profile picture of a User (+ its staff row). Old picture is removed from the Space. */
async function setStaffAvatar(staff, userId, file) {
    const up = await uploadImage(file, 'avatar', 'avatars')
    const oldUrl = staff?.profileImage
    const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { image: true } }) : null
    if (userId) await prisma.user.update({ where: { id: userId }, data: { image: up.url } })
    if (staff) await prisma.crmStaff.update({ where: { id: staff.id }, data: { profileImage: up.url } })
    await deleteMedia([keyFromUrl(oldUrl), keyFromUrl(user?.image)]).catch(() => {})
    return { url: up.url, size: up.size, originalSize: up.originalSize }
}

async function clearStaffAvatar(staff, userId) {
    const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { image: true } }) : null
    if (userId) await prisma.user.update({ where: { id: userId }, data: { image: null } })
    if (staff) await prisma.crmStaff.update({ where: { id: staff.id }, data: { profileImage: null } })
    await deleteMedia([keyFromUrl(staff?.profileImage), keyFromUrl(user?.image)]).catch(() => {})
    return { url: null }
}

const wrap = async (fn) => { try { return await fn() } catch (e) { if (e instanceof MediaError) throw new PermissionError(e.message, e.status); throw e } }

export const uploadOwnAvatar = (file) => wrap(async () => { const { user, staff } = await me(); return setStaffAvatar(staff, user.id, file) })
export const removeOwnAvatar = async () => { const { user, staff } = await me(); return clearStaffAvatar(staff, user.id) }

export async function uploadStaffAvatar(staffId, file) {
    await requirePermission('staff', 'edit')
    const staff = await prisma.crmStaff.findUnique({ where: { id: staffId } })
    if (!staff) fail('Member not found', 404)
    return wrap(() => setStaffAvatar(staff, staff.userId, file))
}
export async function removeStaffAvatar(staffId) {
    await requirePermission('staff', 'edit')
    const staff = await prisma.crmStaff.findUnique({ where: { id: staffId } })
    if (!staff) fail('Member not found', 404)
    return clearStaffAvatar(staff, staff.userId)
}

export async function uploadClientLogo(clientId, file) {
    await requirePermission('customers', 'edit')
    const client = await prisma.crmClient.findUnique({ where: { id: clientId }, select: { id: true, logoUrl: true } })
    if (!client) fail('Client not found', 404)
    return wrap(async () => {
        const up = await uploadImage(file, 'logo', 'clients')
        await prisma.crmClient.update({ where: { id: clientId }, data: { logoUrl: up.url } })
        await deleteMedia(keyFromUrl(client.logoUrl)).catch(() => {})
        return { url: up.url, size: up.size, originalSize: up.originalSize }
    })
}
export async function removeClientLogo(clientId) {
    await requirePermission('customers', 'edit')
    const client = await prisma.crmClient.findUnique({ where: { id: clientId }, select: { logoUrl: true } })
    if (!client) fail('Client not found', 404)
    await prisma.crmClient.update({ where: { id: clientId }, data: { logoUrl: null } })
    await deleteMedia(keyFromUrl(client.logoUrl)).catch(() => {})
    return { url: null }
}

/** Changes the sign-in email of the signed-in user. Needs the `profile.change_email` permission and the current password. */
export async function changeOwnEmail({ newEmail, password }) {
    const { session, user, staff } = await me()
    if (!hasCap(session.user.authority || [], 'profile', 'change_email')) throw new PermissionError('You do not have permission to change your email. Ask an administrator.', 403)
    const email = clean(newEmail, 120).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address')
    if (email === String(user.email).toLowerCase()) fail('This is already your email')
    if (!user.password || !(await bcrypt.compare(String(password || ''), user.password))) fail('Your password is not correct')
    const taken = (await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, NOT: { id: user.id } } })) || (await prisma.crmStaff.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, NOT: staff ? { id: staff.id } : undefined } }))
    if (taken) fail('Another account already uses this email', 409)
    const old = user.email
    await prisma.user.update({ where: { id: user.id }, data: { email, sessionVersion: (user.sessionVersion || 0) + 1 } }) // every session is ended: sign in again with the new email
    await prisma.crmStaff.updateMany({ where: { userId: user.id }, data: { email } })
    await clearFailures(old).catch(() => {})
    // tell the previous address (best effort)
    try {
        const html = await buildHtml(`<h2 style="font-family:Arial,sans-serif;color:#111827">Your sign-in email was changed</h2><p style="font-family:Arial,sans-serif">The email of your account was changed from <strong>${old}</strong> to <strong>${email}</strong>. If this was not you, contact an administrator right away.</p>`, await baseData())
        await deliver({ to: old, subject: 'Your sign-in email was changed', html })
    } catch { /* ignore */ }
    return { success: true, email }
}
