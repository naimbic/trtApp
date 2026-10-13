'use server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { buildCrmAuthority } from '@/lib/crm/authority'

const validateCredential = async (values) => {
    const { email, password } = values

    const user = await prisma.user.findUnique({
        where: { email },
    })

    if (!user || !user.password) return null

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return null

    // Build granular authority from role's accessRight
    const authority = [...new Set([user.role || 'user', ...(user.authority || [])])]
    const role = await prisma.role.findUnique({
        where: { roleId: user.role || 'user' },
    })
    if (role?.accessRight) {
        const ar = typeof role.accessRight === 'string' ? JSON.parse(role.accessRight) : role.accessRight
        for (const [module, perms] of Object.entries(ar)) {
            if (Array.isArray(perms)) {
                for (const perm of perms) {
                    authority.push(`${module}.${perm}`)
                }
            }
        }
    }

    const crm = await buildCrmAuthority(user.id)
    if (crm.blocked) return null
    authority.push(...crm.authority)

    // team members: remember when they last signed in
    prisma.crmStaff.updateMany({ where: { userId: user.id }, data: { lastLogin: new Date(), lastActivity: new Date() } }).catch(() => {})

    return {
        id: user.id,
        userName: user.name,
        email: user.email,
        avatar: user.image,
        authority,
    }
}

export default validateCredential
