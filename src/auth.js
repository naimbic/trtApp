import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import appConfig from '@/configs/app.config'
import authConfig from '@/configs/auth.config'
import validateCredential from '@/server/actions/user/validateCredential'
import prisma from '@/lib/prisma'
import { buildCrmAuthority } from '@/lib/crm/authority'

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    pages: {
        signIn: appConfig.unAuthenticatedEntryPath,
        error: appConfig.unAuthenticatedEntryPath,
    },
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, trigger }) {
            // Initial sign-in
            if (user) {
                token.authority = user.authority
                token.picture = user.image
            }
            // Called when useSession().update() is triggered
            if (trigger === 'update') {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.sub },
                    select: { image: true, name: true, email: true, role: true },
                })
                if (dbUser) {
                    token.picture = dbUser.image
                    token.name = dbUser.name
                    token.email = dbUser.email

                    // Rebuild authority from role's accessRight
                    const authority = [dbUser.role || 'user']
                    const role = await prisma.role.findUnique({
                        where: { roleId: dbUser.role || 'user' },
                    })
                    if (role?.accessRight) {
                        const ar = typeof role.accessRight === 'string' ? JSON.parse(role.accessRight) : role.accessRight
                        for (const [mod, perms] of Object.entries(ar)) {
                            if (Array.isArray(perms)) {
                                for (const perm of perms) {
                                    authority.push(`${mod}.${perm}`)
                                }
                            }
                        }
                    }
                    authority.push(...(await buildCrmAuthority(token.sub)).authority)
                    token.authority = authority
                }
            }
            return token
        },
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.sub,
                    authority: token.authority,
                    image: token.picture || null,
                },
            }
        },
    },
    providers: [
        ...authConfig.providers,
        Credentials({
            async authorize(credentials) {
                const user = await validateCredential(credentials)
                if (!user) {
                    return null
                }

                return {
                    id: user.id,
                    name: user.userName,
                    email: user.email,
                    image: user.avatar,
                    authority: user.authority,
                }
            },
        }),
    ],
})
