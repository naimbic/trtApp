import prisma from '@/lib/prisma'

/**
 * Perfex permissions -> trtApp authority strings for a signed-in User.
 *   super admin staff      -> ['crm.admin']
 *   regular staff          -> ['crm.<feature>.<capability>', ...] from crm_staff_permissions
 * Returns { authority: string[], blocked: boolean }. `blocked` is true when the user is
 * linked to an INACTIVE Perfex staff member (inactive accounts must never sign in).
 */
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
        return { authority: [...new Set(authority)], blocked: false }
    } catch {
        return { authority: [], blocked: false }
    }
}
