import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import appConfig from '@/configs/app.config'
import authConfig from '@/configs/auth.config'
import validateCredential from '@/server/actions/user/validateCredential'
import prisma from '@/lib/prisma'
import { buildUserAuthority } from '@/lib/crm/authBuild'
import { resolveSocialUser } from '@/lib/crm/socialLogin'

// Google / GitHub: the account is the CRM user with the same verified email (see socialLogin.js)
const socialDeps = {
    findByEmail: (email) => prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }),
    authorityOf: (user) => buildUserAuthority(user),
}

const SESSION_RECHECK_MS = 5 * 1000 // a changed permission reaches the person's session within seconds

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    pages: {
        signIn: appConfig.unAuthenticatedEntryPath,
        error: appConfig.unAuthenticatedEntryPath,
    },
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ account, profile, user }) {
            if (!account || account.provider === 'credentials') return true
            const r = await resolveSocialUser({ account, profile, user }, socialDeps)
            // a text is a place to send the person: the sign-in page explains what went wrong
            return r.ok ? true : `${appConfig.unAuthenticatedEntryPath}?oidc_error=${r.code}`
        },
        async jwt({ token, user, trigger, account, profile }) {
            // first step of a Google / GitHub sign-in: the session belongs to the CRM user, not to the provider's id
            if (account && account.provider !== 'credentials') {
                const r = await resolveSocialUser({ account, profile, user }, socialDeps)
                if (!r.ok) return null
                token.sub = r.user.id
                token.name = r.user.name
                token.email = r.user.email
                token.authority = r.authority
                token.picture = r.user.image
                token.sv = r.user.sessionVersion || 0
                token.chk = Date.now()
                prisma.crmStaff.updateMany({ where: { userId: r.user.id }, data: { lastLogin: new Date(), lastActivity: new Date() } }).catch(() => {})
                return token
            }
            // Initial sign-in
            if (user) {
                token.authority = user.authority
                token.picture = user.image
                token.sv = user.sv || 0
                token.chk = Date.now()
                return token
            }

            // Re-check the account at most every 5s: honours "sign out everywhere", deactivation and
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
