import prisma from '@/lib/prisma'

// The user table as the login steps use it.
export const users = {
    findBySub: (sub) => prisma.user.findFirst({ where: { trtagencySub: sub } }),
    findByEmail: (email) => prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }),
    touch: (id, data) => prisma.user.update({ where: { id }, data }),
    /** A new account: a user and a team member without any permission (an administrator gives it a role in Team). */
    async create({ sub, username, email, name, verified }) {
        const [firstName, ...rest] = String(name || email).split(/\s+/)
        const user = await prisma.user.create({
            data: { name: String(name || email), email, password: null, authority: ['user'], role: 'user', status: 'active', firstName, lastName: rest.join(' ') || null, emailVerified: verified ? new Date() : null, trtagencySub: sub, trtagencyUsername: username },
        })
        await prisma.crmStaff.create({ data: { userId: user.id, email, firstName, lastName: rest.join(' ') || null, roleId: null, admin: false, active: true } })
        return user
    },
}
