import prisma from '@/lib/prisma'
import { buildCrmAuthority } from '@/lib/crm/authority'

/**
 * The full authority list for a User row (template role access rights + CRM staff permissions).
 * `blocked` is true for accounts linked to an inactive team member (they must never hold a session).
 */
export async function buildUserAuthority(user) {
    const authority = [...new Set([user.role || 'user', ...(user.authority || [])])]
    const role = await prisma.role.findUnique({ where: { roleId: user.role || 'user' } })
    if (role?.accessRight) {
        const ar = typeof role.accessRight === 'string' ? JSON.parse(role.accessRight) : role.accessRight
        for (const [module, perms] of Object.entries(ar)) {
            if (Array.isArray(perms)) for (const perm of perms) authority.push(`${module}.${perm}`)
        }
    }
    const crm = await buildCrmAuthority(user.id)
    if (crm.blocked) return { authority: [], blocked: true }
    authority.push(...crm.authority)
    return { authority, blocked: false }
}
