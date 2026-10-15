import { realPicture } from '@/lib/crm/pictures'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { requirePermission, isCrmAdmin, getStaffId } from '@/lib/crm/permissions'
import { parseRolePermissions, toPermissionRows } from '@/lib/crm/rolePermissions'
import { createAuthToken, signOutEverywhere } from '@/lib/crm/authTokens'
import { webBaseUrl } from '@/lib/crm/account'
import { sendMail, isMailConfigured } from '@/lib/mail'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Readable one-time password (never stored in clear, never logged). */
export const generatePassword = () => crypto.randomBytes(9).toString('base64url')

const shape = (s) => ({
    id: s.id,
    userId: s.userId,
    hasLogin: !!s.userId,
    firstName: s.firstName || '',
    lastName: s.lastName || '',
    name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email || '—',
    email: s.email,
    phone: s.phoneNumber || '',
    active: s.active,
    admin: s.admin,
    isNotStaff: s.isNotStaff,
    hourlyRate: s.hourlyRate || 0,
    language: s.defaultLanguage || '',
    twoFactor: s.twoFactorAuthEnabled,
    role: s.role ? { id: s.role.id, name: s.role.name } : null,
    roleId: s.roleId || null,
    departments: (s.departments || []).map((d) => ({ id: d.departmentId, name: d.department?.name || '' })),
    image: realPicture(s.profileImage),
    jobTitle: s.jobTitle || '',
    bio: s.bio || '',
    timezone: s.timezone || '',
    website: s.website || '',
    whatsapp: s.whatsapp || '',
    facebook: s.facebook || '',
    linkedin: s.linkedin || '',
    skype: s.skype || '',
    lastLogin: s.lastLogin,
    createdAt: s.createdAt,
})

// Departments are resolved separately: links to deleted departments must not break the whole list.
const include = { role: true, departments: true }
async function withDepartments(rows) {
    const list = Array.isArray(rows) ? rows : rows ? [rows] : []
    const names = new Map((await prisma.crmDepartment.findMany({ select: { id: true, name: true } })).map((d) => [d.id, d]))
    for (const s of list) s.departments = (s.departments || []).filter((l) => names.has(l.departmentId)).map((l) => ({ ...l, department: names.get(l.departmentId) }))
    return rows
}

export async function teamLookups() {
    await requirePermission('staff', 'view')
    const [roles, departments] = await Promise.all([
        prisma.crmRole.findMany({ orderBy: { name: 'asc' } }),
        prisma.crmDepartment.findMany({ orderBy: { name: 'asc' } }),
    ])
    return { roles: roles.map((r) => ({ id: r.id, name: r.name })), departments: departments.map((d) => ({ id: d.id, name: d.name })) }
}

export async function listTeam({ search = '', status = 'all' } = {}) {
    await requirePermission('staff', 'view')
    const where = {
        ...(status === 'active' ? { active: true } : status === 'inactive' ? { active: false } : {}),
        ...(search
            ? { OR: ['firstName', 'lastName', 'email', 'phoneNumber'].map((f) => ({ [f]: { contains: search, mode: 'insensitive' } })) }
            : {}),
    }
    const rows = await withDepartments(await prisma.crmStaff.findMany({ where, include, orderBy: [{ active: 'desc' }, { firstName: 'asc' }] }))
    const all = await prisma.crmStaff.findMany({ select: { active: true, admin: true, userId: true } })
    return {
        members: rows.map(shape),
        stats: { total: all.length, active: all.filter((s) => s.active).length, inactive: all.filter((s) => !s.active).length, admins: all.filter((s) => s.admin && s.active).length, withLogin: all.filter((s) => s.userId).length },
    }
}

async function applyRolePermissions(staffId, roleId) {
    await prisma.crmStaffPermission.deleteMany({ where: { staffId } })
    if (!roleId) return
    const role = await prisma.crmRole.findUnique({ where: { id: roleId } })
    const rows = toPermissionRows(parseRolePermissions(role?.permissionsRaw))
    if (rows.length) await prisma.crmStaffPermission.createMany({ data: rows.map((r) => ({ ...r, staffId })) })
}

async function setDepartments(staffId, ids = []) {
    await prisma.crmStaffDepartment.deleteMany({ where: { staffId } })
    const unique = [...new Set(ids)].filter(Boolean)
    if (unique.length) await prisma.crmStaffDepartment.createMany({ data: unique.map((departmentId) => ({ staffId, departmentId })) })
}

/** Create a team member and their login account. Returns { member, tempPassword } (password shown once). */
export async function createMember(body, request) {
    const session = await requirePermission('staff', 'create')
    const admin = isCrmAdmin(session.user.authority || [])
    const email = String(body.email || '').trim().toLowerCase()
    const firstName = String(body.firstName || '').trim()
    if (!firstName) throw httpError('First name is required')
    if (!EMAIL.test(email)) throw httpError('A valid email is required')
    if (body.password && String(body.password).length < 8) throw httpError('Password must be at least 8 characters')
    if ((await prisma.crmStaff.findFirst({ where: { email } })) || (await prisma.user.findUnique({ where: { email } }))) throw httpError('A user with this email already exists', 409)
    if (body.admin && !admin) throw httpError('Only an administrator can create another administrator', 403)

    // invite: the member chooses their own password through a one-time link (nobody ever sees a password)
    const invite = !!body.invite && !body.password
    const tempPassword = body.password || invite ? null : generatePassword()
    const hash = await bcrypt.hash(body.password || tempPassword || generatePassword(), 10)
    const lastName = String(body.lastName || '').trim()
    const user = await prisma.user.create({
        data: { name: `${firstName} ${lastName}`.trim(), email, password: hash, authority: ['user'], role: 'user', status: 'active', image: '/img/avatars/thumb-1.jpg' },
    })
    const staff = await prisma.crmStaff.create({
        data: {
            userId: user.id, email, firstName, lastName: lastName || null, phoneNumber: body.phone || null,
            roleId: body.roleId || null, admin: !!body.admin, active: body.active !== false,
            hourlyRate: Number(body.hourlyRate) || 0, defaultLanguage: body.language || null,
        },
    })
    await applyRolePermissions(staff.id, staff.roleId)
    await setDepartments(staff.id, body.departmentIds)
    const full = await withDepartments(await prisma.crmStaff.findUnique({ where: { id: staff.id }, include }))
    let inviteLink = null
    if (invite) {
        const { token } = await createAuthToken(user.id, 'invite', session.user.id)
        inviteLink = `${webBaseUrl(request)}/reset-password?token=${token}`
        if (isMailConfigured()) sendMail({ to: email, subject: 'You have been invited', text: `Hello ${firstName},\n\nYou have been added to the team. Choose your password here (valid for 7 days):\n${inviteLink}` }).catch((e) => console.error('[team] invite email failed:', e.message))
    }
    return { member: shape(full), tempPassword, inviteLink, emailed: !!inviteLink && isMailConfigured() }
}

export async function updateMember(id, body) {
    const session = await requirePermission('staff', 'edit')
    const admin = isCrmAdmin(session.user.authority || [])
    const me = await getStaffId(session)
    const s = await prisma.crmStaff.findUnique({ where: { id } })
    if (!s) throw httpError('Member not found', 404)

    const data = {}
    if (body.firstName !== undefined) {
        if (!String(body.firstName).trim()) throw httpError('First name is required')
        data.firstName = String(body.firstName).trim()
    }
    if (body.lastName !== undefined) data.lastName = String(body.lastName).trim() || null
    if (body.phone !== undefined) data.phoneNumber = body.phone || null
    if (body.hourlyRate !== undefined) data.hourlyRate = Number(body.hourlyRate) || 0
    if (body.language !== undefined) data.defaultLanguage = body.language || null
    const text = (k, max, field = k) => { if (body[k] !== undefined) data[field] = String(body[k] ?? '').trim().slice(0, max) || null }
    text('jobTitle', 80); text('bio', 500); text('timezone', 60); text('skype', 80); text('whatsapp', 25)
    for (const k of ['website', 'facebook', 'linkedin']) if (body[k] !== undefined) {
        const v = String(body[k] ?? '').trim().slice(0, 200)
        if (v && !/^https?:\/\/[^\s]+$/i.test(v)) throw httpError(`${k[0].toUpperCase() + k.slice(1)} must be a full link starting with https://`)
        data[k] = v || null
    }
    if (body.email !== undefined && body.email.toLowerCase() !== s.email) {
        const email = String(body.email).trim().toLowerCase()
        if (!EMAIL.test(email)) throw httpError('A valid email is required')
        if ((await prisma.crmStaff.findFirst({ where: { email, NOT: { id } } })) || (await prisma.user.findFirst({ where: { email, NOT: { id: s.userId || undefined } } }))) throw httpError('A user with this email already exists', 409)
        data.email = email
    }
    if (body.active !== undefined && body.active !== s.active) {
        if (!body.active && (id === me || (s.userId && s.userId === session.user.id))) throw httpError('You cannot deactivate your own account', 400)
        data.active = !!body.active
    }
    let demoted = false
    if (body.admin !== undefined && body.admin !== s.admin) {
        if (!admin) throw httpError('Only an administrator can change administrator status', 403)
        if (!body.admin && s.admin) {
            const others = await prisma.crmStaff.count({ where: { admin: true, active: true, NOT: { id } } })
            if (!others) throw httpError('At least one active administrator is required', 400)
        }
        data.admin = !!body.admin
        if (!body.admin && s.admin) demoted = true
    }
    const roleChanged = body.roleId !== undefined && (body.roleId || null) !== s.roleId
    if (roleChanged) data.roleId = body.roleId || null

    if (Object.keys(data).length) await prisma.crmStaff.update({ where: { id }, data })
    if (roleChanged && body.applyRolePermissions !== false) await applyRolePermissions(id, data.roleId)
    if (demoted) {
        // a Super Admin becomes a normal Admin: give them the permissions of their role (or of the Admin role) so they keep working, and drop the legacy "admin" login flags
        const have = await prisma.crmStaffPermission.count({ where: { staffId: id } })
        if (!have) {
            const role = data.roleId ? { id: data.roleId } : s.roleId ? { id: s.roleId } : await prisma.crmRole.findFirst({ where: { name: { equals: 'Admin', mode: 'insensitive' } } })
            if (role) { await applyRolePermissions(id, role.id); if (!data.roleId && !s.roleId) await prisma.crmStaff.update({ where: { id }, data: { roleId: role.id } }) }
        }
        if (s.userId) {
            const u = await prisma.user.findUnique({ where: { id: s.userId }, select: { role: true, authority: true } })
            if (u) await prisma.user.update({ where: { id: s.userId }, data: { role: u.role === 'admin' ? 'user' : u.role, authority: (u.authority || []).filter((a) => a !== 'admin' && a !== 'crm.admin') } })
        }
    }
    if (Array.isArray(body.departmentIds)) await setDepartments(id, body.departmentIds)

    // keep the login account in step with the profile
    if (s.userId) {
        const u = {}
        if (data.email) u.email = data.email
        if (data.firstName !== undefined || data.lastName !== undefined) {
            const fresh = await prisma.crmStaff.findUnique({ where: { id } })
            u.name = `${fresh.firstName || ''} ${fresh.lastName || ''}`.trim()
        }
        if (Object.keys(u).length) await prisma.user.update({ where: { id: s.userId }, data: u })
    }
    return shape(await withDepartments(await prisma.crmStaff.findUnique({ where: { id }, include })))
}

/** Set a new one-time password for the member's login account (shown once to the administrator). */
export async function resetMemberPassword(id) {
    await requirePermission('staff', 'edit')
    const s = await prisma.crmStaff.findUnique({ where: { id } })
    if (!s) throw httpError('Member not found', 404)
    if (!s.userId) throw httpError('This member has no login account', 400)
    const tempPassword = generatePassword()
    await prisma.user.update({ where: { id: s.userId }, data: { password: await bcrypt.hash(tempPassword, 10) } })
    await prisma.crmStaff.update({ where: { id }, data: { lastPasswordChange: new Date() } })
    return { tempPassword }
}

/** One-time link to set a new password (purpose 'reset', 1 h) or first password (purpose 'invite', 7 days). */
export async function createMemberLink(id, purpose, request) {
    const session = await requirePermission('staff', 'edit')
    const s = await prisma.crmStaff.findUnique({ where: { id } })
    if (!s) throw httpError('Member not found', 404)
    if (!s.userId) throw httpError('This member has no login account', 400)
    const { token, expiresAt } = await createAuthToken(s.userId, purpose === 'invite' ? 'invite' : 'reset', session.user.id)
    const link = `${webBaseUrl(request)}/reset-password?token=${token}`
    let emailed = false
    if (isMailConfigured() && s.email) {
        try {
            await sendMail({ to: s.email, subject: purpose === 'invite' ? 'You have been invited' : 'Reset your password', text: `Hello ${s.firstName || ''},\n\nChoose a new password here:\n${link}` })
            emailed = true
        } catch (e) {
            console.error('[team] link email failed:', e.message)
        }
    }
    return { link, expiresAt, emailed }
}

/** End every session of a member (they must sign in again). */
export async function signOutMember(id) {
    await requirePermission('staff', 'edit')
    const s = await prisma.crmStaff.findUnique({ where: { id } })
    if (!s) throw httpError('Member not found', 404)
    if (!s.userId) throw httpError('This member has no login account', 400)
    return signOutEverywhere(s.userId)
}
