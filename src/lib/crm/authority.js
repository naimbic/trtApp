import prisma from '@/lib/prisma'

/**
 * Perfex permissions -> trtApp authority strings for a signed-in User.
 *   super admin staff      -> ['crm.admin']
 *   regular staff          -> ['crm.<feature>.<capability>', ...] from crm_staff_permissions
 * Returns { authority: string[], blocked: boolean }. `blocked` is true when the user is
 * linked to an INACTIVE Perfex staff member (inactive accounts must never sign in).
 */
// Capabilities Perfex grants every active staff member without a checkbox (see permissionCatalog `auto`).
const IMPLICIT = ['customers.view_own', 'payments.view_own', 'projects.view_own', 'tasks.view_own', 'leads.view_own', 'leads.create', 'leads.edit']

export async function buildCrmAuthority(userId) {
    try {
        const staff = await prisma.crmStaff.findFirst({
            where: { userId },
            include: { permissions: true },
        })
        if (!staff) return { authority: [], blocked: false }
        if (!staff.active) return { authority: [], blocked: true }
        if (staff.admin) return { authority: ['crm.admin'], blocked: false }
        const authority = staff.permissions
            .filter((p) => p.feature && p.capability)
            .map((p) => `crm.${p.feature}.${p.capability}`)
        return { authority: [...new Set([...authority, ...IMPLICIT.map((c) => `crm.${c}`)])], blocked: false }
    } catch {
        return { authority: [], blocked: false }
    }
}
