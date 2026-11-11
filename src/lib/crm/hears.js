import prisma from '@/lib/prisma'
import { authorityFromStaff } from '@/lib/crm/authority'
import { viewScope } from '@/lib/crm/permissions'

/**
 * Whether an active staff member may see a kind of record at all (View or View own of the feature, Roles). A notification about
 * something is only sent to people who could open it, so nobody is told about a part of the CRM their role does not include.
 */
export async function mayHear(staffId, feature) {
    const staff = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { id: true, active: true, admin: true, permissions: true } })
    if (!staff?.active) return false
    return viewScope(authorityFromStaff(staff), feature) !== null
}
