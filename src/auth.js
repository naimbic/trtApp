import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import appConfig from '@/configs/app.config'
import authConfig from '@/configs/auth.config'
import validateCredential from '@/server/actions/user/validateCredential'
import prisma from '@/lib/prisma'
import { buildUserAuthority } from '@/lib/crm/authBuild'

const SESSION_RECHECK_MS = 30 * 1000

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
                token.sv = user.sv || 0
                token.chk = Date.now()
                return token
            }

            // Re-check the account at most every 30s: honours "sign out everywhere", deactivation and
            // permission changes without waiting for the user to sign in again.
            if (token.sub && (trigger === 'update' || !token.chk || Date.now() - token.chk > SESSION_RECHECK_MS)) {
                const dbUser = await prisma.user.findUnique({ where: { id: token.sub } })
                if (!dbUser) return null
                if ((dbUser.sessionVersion || 0) !== (token.sv || 0)) return null // signed out everywhere
                const { authority, blocked } = await buildUserAuthority(dbUser)
                if (blocked) return null // deactivated
                token.authority = authority
                token.picture = dbUser.image
                token.name = dbUser.name
                token.email = dbUser.email
                token.chk = Date.now()
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
                    sv: user.sv,
                }
            },
        }),
    ],
})
