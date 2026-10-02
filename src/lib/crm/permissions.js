import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * Perfex-style permission model on top of trtApp authority strings.
 *   authority contains 'admin' | 'crm.admin'  -> everything
 *   authority contains `crm.<feature>.<cap>`  -> view | view_own | create | edit | delete | <extra>
 * `view` implies `view_own`.
 */
export class PermissionError extends Error {
    constructor(message, status = 403) {
        super(message)
        this.status = status
    }
}

export const isCrmAdmin = (authority = []) =>
    authority.includes('admin') || authority.includes('crm.admin')

export const hasCap = (authority = [], feature, cap) => {
    if (isCrmAdmin(authority)) return true
    if (authority.includes(`crm.${feature}.${cap}`)) return true
    if (cap === 'view_own') return authority.includes(`crm.${feature}.view`)
    return false
}

/** 'all' | 'own' | null — what a user may see for a feature. */
export const viewScope = (authority = [], feature) => {
    if (hasCap(authority, feature, 'view')) return 'all'
    if (hasCap(authority, feature, 'view_own')) return 'own'
    return null
}

export const can = (session, feature, cap) =>
    hasCap(session?.user?.authority || [], feature, cap)

/** Returns the session or throws PermissionError (401/403). */
export async function requirePermission(feature, cap) {
    const session = await auth()
    if (!session?.user?.id) throw new PermissionError('Unauthorized', 401)
    if (!feature) return session // resource without a feature: signed-in is enough
    const authority = session.user.authority || []
    const ok =
        cap === 'view'
            ? viewScope(authority, feature) !== null
            : hasCap(authority, feature, cap)
    if (!ok) throw new PermissionError('Forbidden', 403)
    return session
}

/** CrmStaff id for the signed-in User (null if the user is not linked to a staff row). */
export async function getStaffId(session) {
    const userId = session?.user?.id
    if (!userId) return null
    try {
        const staff = await prisma.crmStaff.findFirst({
            where: { userId },
            select: { id: true },
        })
        return staff?.id || null
    } catch {
        return null
    }
}
