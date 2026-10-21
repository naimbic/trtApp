import NextAuth from 'next-auth'
import authConfig from '@/configs/auth.config'
import {
    authRoutes as _authRoutes,
    publicRoutes as _publicRoutes,
    protectedRoutes,
} from '@/configs/routes.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import appConfig from '@/configs/app.config'

const { auth } = NextAuth(authConfig)

const publicRoutes = Object.entries(_publicRoutes).map(([key]) => key)
const authRoutes = Object.entries(_authRoutes).map(([key]) => key)

const DEMO_API = /^\/api\/(ai|customers|invoices|products|projects|pricing|redirects|roles|helps|md|logs|search|contacts|files|setting|changelog|conversations|chat|mail|sites|admin|debug)(\/|$)/

const apiAuthPrefix = `${appConfig.apiPrefix}/auth`

export default auth((req) => {
    const { nextUrl } = req
    const isSignedIn = !!req.auth

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
    const isApiRoute = nextUrl.pathname.startsWith(appConfig.apiPrefix)
    const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
    const isAuthRoute = authRoutes.includes(nextUrl.pathname)

    /** A staff preview of the client area (cookie flag `imp`) can look but not change anything */
    if (nextUrl.pathname.startsWith('/api/portal/') && req.method !== 'GET' && req.method !== 'HEAD' && nextUrl.pathname !== '/api/portal/auth/logout') {
        try {
            const raw = req.cookies.get('trtportal')?.value || ''
            const body = JSON.parse(atob(raw.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')))
            if (body?.imp) return Response.json({ error: 'Preview mode is read-only' }, { status: 403 })
        } catch { /* no portal cookie */ }
    }

    /** Leftover template demo endpoints (mock data, but also real staff lists): a session is required for all of them */
    if (isApiRoute && !isSignedIn && DEMO_API.test(nextUrl.pathname)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    /** Skip auth middleware for all api routes — they handle auth internally */
    if (isApiRoute) return

    if (isAuthRoute) {
        if (isSignedIn) {
            /** Redirect to authenticated entry path if signed in & path is auth route */
            return Response.redirect(
                new URL(appConfig.authenticatedEntryPath, nextUrl),
            )
        }
        return
    }

    /** Redirect to authenticated entry path if signed in & path is public route */
    if (!isSignedIn && !isPublicRoute) {
        let callbackUrl = nextUrl.pathname
        if (nextUrl.search) {
            callbackUrl += nextUrl.search
        }

        return Response.redirect(
            new URL(
                `${appConfig.unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${callbackUrl}`,
                nextUrl,
            ),
        )
    }

    /** Role based access control */
    if (isSignedIn && nextUrl.pathname !== '/access-denied' && !nextUrl.pathname.startsWith(appConfig.apiPrefix)) {
        // Try exact match first, then dynamic route patterns
        let routeMeta = protectedRoutes[nextUrl.pathname]
        if (!routeMeta) {
            for (const [pattern, meta] of Object.entries(protectedRoutes)) {
                if (meta.dynamicRoute) {
                    const regex = new RegExp('^' + pattern.replace(/\[[\w]+\]/g, '[^/]+') + '$')
                    if (regex.test(nextUrl.pathname)) {
                        routeMeta = meta
                        break
                    }
                }
            }
        }
        if (routeMeta && routeMeta.authority?.length > 0) {
            const userAuth = req.auth?.user?.authority || []
            // Admin role bypasses all permission checks
            if (!userAuth.includes('admin') && !routeMeta.authority.some((role) => userAuth.includes(role))) {
                return Response.redirect(
                    new URL('/access-denied', nextUrl),
                )
            }
        }
    }
})

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api)(.*)'],
}
