import prisma from '@/lib/prisma'
import { ROLES } from '@/lib/crm/standardRoles'
import { cleanPermissions } from '@/lib/crm/permissionCatalog'
import { parseRolePermissions, toPermissionRows } from '@/lib/crm/rolePermissions'

const TABS = ['report_sales', 'report_profit', 'report_leads', 'report_support', 'report_work']
const MARK = 'perm_migration_reports_v1'

/**
 * One-time data fix when reports got one permission per report: everybody (and every role) that could already open
 * Reports keeps all reports. "See money amounts" is deliberately NOT granted: switch it on per role or person.
 * Safe to run on every start: it stops once the marker setting exists.
 */
export async function migratePermissions() {
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const rows = await prisma.crmStaffPermission.findMany({ where: { feature: 'reports', capability: 'view' }, select: { staffId: true } })
    for (const { staffId } of rows) {
        const have = new Set((await prisma.crmStaffPermission.findMany({ where: { staffId, feature: 'reports' }, select: { capability: true } })).map((r) => r.capability))
        const add = TABS.filter((t) => !have.has(t))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add.map((capability) => ({ staffId, feature: 'reports', capability })) })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!Array.isArray(perms.reports) || !perms.reports.includes('view')) continue
        perms.reports = [...new Set([...perms.reports, ...TABS])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** Creates the standard roles that do not exist yet (never changes an existing role). Runs once, marker-guarded. */
export async function ensureStandardRoles() {
    const MARK2 = 'standard_roles_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK2 } })) return
    for (const [name, perms] of Object.entries(ROLES)) {
        if (await prisma.crmRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) continue
        await prisma.crmRole.create({ data: { name, permissionsRaw: JSON.stringify(cleanPermissions(perms)) } })
    }
    await prisma.crmOption.create({ data: { name: MARK2, value: new Date().toISOString() } })
}

const SUPER_EMAIL = 'ask@trtdigital.ma'

/**
 * Super Admin and Admin are separate: only ask@trtdigital.ma keeps the full-access flag. Every other administrator
 * imported from Perfex becomes an Admin (a normal role whose permissions can be edited). Runs once, marker-guarded,
 * and only when the Super Admin account exists, so nobody can be locked out.
 */
export async function splitAdmins() {
    const MARK3 = 'admins_split_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK3 } })) return
    const sup = await prisma.crmStaff.findFirst({ where: { email: { equals: SUPER_EMAIL, mode: 'insensitive' }, admin: true, active: true } })
    if (!sup) return // nothing to protect yet: try again at the next start
    const role = await prisma.crmRole.findFirst({ where: { name: { equals: 'Admin', mode: 'insensitive' } } })
    if (!role) return
    const rows = toPermissionRows(parseRolePermissions(role.permissionsRaw))
    for (const s of await prisma.crmStaff.findMany({ where: { admin: true, NOT: { id: sup.id } } })) {
        await prisma.crmStaffPermission.deleteMany({ where: { staffId: s.id } })
        if (rows.length) await prisma.crmStaffPermission.createMany({ data: rows.map((r) => ({ ...r, staffId: s.id })) })
        await prisma.crmStaff.update({ where: { id: s.id }, data: { admin: false, roleId: role.id } })
        if (s.userId) {
            const u = await prisma.user.findUnique({ where: { id: s.userId }, select: { role: true, authority: true } })
            if (u) await prisma.user.update({ where: { id: s.userId }, data: { role: u.role === 'admin' ? 'user' : u.role, authority: (u.authority || []).filter((a) => a !== 'admin' && a !== 'crm.admin') } })
        }
    }
    await prisma.crmOption.create({ data: { name: MARK3, value: new Date().toISOString() } })
}
