import prisma from '@/lib/prisma'
import { requirePermission, isCrmAdmin, hasCap } from '@/lib/crm/permissions'
import { parseRolePermissions, toPermissionRows } from '@/lib/crm/rolePermissions'
import { cleanPermissions } from '@/lib/crm/permissionCatalog'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })
const isSuperRole = (name) => /^super admin$/i.test(String(name || '').trim())

/** Non-admins may only hand out capabilities they hold themselves (no privilege escalation). */
function assertCanGrant(authority, perms) {
    if (isCrmAdmin(authority)) return
    for (const [feature, caps] of Object.entries(perms)) {
        for (const cap of caps) if (!hasCap(authority, feature, cap)) throw httpError(`You cannot grant "${cap}" on ${feature} because you do not have it`, 403)
    }
}

const shapeRole = (r, members) => {
    const permissions = cleanPermissions(parseRolePermissions(r.permissionsRaw))
    return { id: r.id, name: r.name, permissions, permissionCount: Object.values(permissions).reduce((n, c) => n + c.length, 0), members }
}

export async function listRoles() {
    await requirePermission('roles', 'view')
    const [roles, staff] = await Promise.all([prisma.crmRole.findMany({ orderBy: { name: 'asc' } }), prisma.crmStaff.findMany({ select: { roleId: true } })])
    const count = {}
    staff.forEach((s) => s.roleId && (count[s.roleId] = (count[s.roleId] || 0) + 1))
    return roles.map((r) => shapeRole(r, count[r.id] || 0))
}

export async function createRole(body) {
    const session = await requirePermission('roles', 'create')
    const name = String(body.name || '').trim()
    if (!name) throw httpError('Role name is required')
    if (isSuperRole(name)) throw httpError('The Super Admin role already exists and is fixed', 409)
    if (await prisma.crmRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) throw httpError('A role with this name already exists', 409)
    const permissions = cleanPermissions(body.permissions)
    assertCanGrant(session.user.authority || [], permissions)
    const r = await prisma.crmRole.create({ data: { name, permissionsRaw: JSON.stringify(permissions) } })
    return shapeRole(r, 0)
}

/** body: { name?, permissions?, applyToMembers? } */
export async function updateRole(id, body) {
    const session = await requirePermission('roles', 'edit')
    const role = await prisma.crmRole.findUnique({ where: { id } })
    if (!role) throw httpError('Role not found', 404)
    if (isSuperRole(role.name) || isSuperRole(body.name)) throw httpError('The Super Admin role is fixed and cannot be changed', 400)
    const data = {}
    if (body.name !== undefined) {
        const name = String(body.name).trim()
        if (!name) throw httpError('Role name is required')
        if (await prisma.crmRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } } })) throw httpError('A role with this name already exists', 409)
        data.name = name
    }
    let permissions
    if (body.permissions !== undefined) {
        permissions = cleanPermissions(body.permissions)
        assertCanGrant(session.user.authority || [], permissions)
        data.permissionsRaw = JSON.stringify(permissions)
    }
    const r = await prisma.crmRole.update({ where: { id }, data })
    let applied = 0
    if (body.applyToMembers && permissions) {
        const members = await prisma.crmStaff.findMany({ where: { roleId: id, admin: false }, select: { id: true } })
        for (const m of members) {
            await prisma.crmStaffPermission.deleteMany({ where: { staffId: m.id } })
            const rows = toPermissionRows(permissions)
            if (rows.length) await prisma.crmStaffPermission.createMany({ data: rows.map((x) => ({ ...x, staffId: m.id })) })
            applied += 1
        }
    }
    const members = await prisma.crmStaff.count({ where: { roleId: id } })
    return { ...shapeRole(r, members), applied }
}

export async function deleteRole(id) {
    await requirePermission('roles', 'delete')
    const target = await prisma.crmRole.findUnique({ where: { id }, select: { name: true } })
    if (isSuperRole(target?.name)) throw httpError('The Super Admin role is fixed and cannot be deleted', 400)
    const members = await prisma.crmStaff.count({ where: { roleId: id } })
    if (members) throw httpError(`This role is assigned to ${members} member${members > 1 ? 's' : ''}. Move them to another role first.`, 409)
    await prisma.crmRole.delete({ where: { id } })
    return { success: true }
}

export async function getStaffAccess(id) {
    await requirePermission('staff', 'view')
    const s = await prisma.crmStaff.findUnique({ where: { id }, include: { permissions: true, role: true } })
    if (!s) throw httpError('Member not found', 404)
    const perms = {}
    for (const p of s.permissions) if (p.feature && p.capability) (perms[p.feature] ||= []).push(p.capability)
    return {
        id: s.id,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
        admin: s.admin,
        role: s.role ? { id: s.role.id, name: s.role.name, permissions: cleanPermissions(parseRolePermissions(s.role.permissionsRaw)) } : null,
        permissions: cleanPermissions(perms),
    }
}

export async function setStaffAccess(id, body) {
    const session = await requirePermission('staff', 'edit')
    const s = await prisma.crmStaff.findUnique({ where: { id } })
    if (!s) throw httpError('Member not found', 404)
    if (s.admin) throw httpError('A Super Admin has full access and cannot be edited', 400)
    const permissions = cleanPermissions(body.permissions)
    assertCanGrant(session.user.authority || [], permissions)
    await prisma.crmStaffPermission.deleteMany({ where: { staffId: id } })
    const rows = toPermissionRows(permissions)
    if (rows.length) await prisma.crmStaffPermission.createMany({ data: rows.map((r) => ({ ...r, staffId: id })) })
    return getStaffAccess(id)
}
