import NextAuth from 'next-auth'
import authConfig from '@/configs/auth.config'
import {
    authRoutes as _authRoutes,
    publicRoutes as _publicRoutes,
    protectedRoutes,
} from '@/configs/routes.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import appConfig from '@/configs/app.config'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { crossSiteWrite, countsAsAnonymousWrite } from '@/lib/requestShield'

const { auth } = NextAuth(authConfig)

const publicRoutes = Object.entries(_publicRoutes).map(([key]) => key)
const authRoutes = Object.entries(_authRoutes).map(([key]) => key)

const DEMO_API = /^\/api\/(ai|customers|invoices|products|projects|pricing|redirects|roles|helps|md|logs|search|contacts|files|setting|changelog|conversations|chat|mail|sites|admin|debug)(\/|$)/

const apiAuthPrefix = `${appConfig.apiPrefix}/auth`

// The request shield: two protections that do not depend on each address remembering them.
const OWN_ORIGINS = [process.env.AUTH_URL, process.env.NEXTAUTH_URL, process.env.APP_URL, 'https://trtmaroc.com'].filter(Boolean)
const ANON_WRITES_PER_MINUTE = 60
const refuse = (status, error, extra) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...extra } })

// What the shield refuses is kept for the Security log page. This code cannot reach the database itself, so it tells
// the server's own address, signed with a key only the server knows; one note a minute for each kind and visitor.
const noted = new Map()
let shieldKey = null
const keyOfShield = () => (shieldKey ||= crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''}:shield`)).then((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')))
function note(ev, event) {
    const k = `${event.kind}:${event.ip}`
    const now = Date.now()
    if (now - (noted.get(k) || 0) < 60000) return
    if (noted.size > 5000) noted.clear()
    noted.set(k, now)
    const send = keyOfShield().then((key) => fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/crm/security/record`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-shield-key': key }, body: JSON.stringify(event) })).catch(() => {})
    ev?.waitUntil?.(send)
}

function shield(req, ev) {
    const path = req.nextUrl.pathname
    if (!path.startsWith(appConfig.apiPrefix)) return null
    const h = req.headers
    const method = req.method
    const hasKey = !!(h.get('authorization') || h.get('x-api-key') || h.get('x-trt-key'))
    const ip = clientIp(req)
    // a page of another website may not make a signed-in person's browser change things here
    if (crossSiteWrite({ method, path, origin: h.get('origin'), host: h.get('x-forwarded-host') || h.get('host'), allowed: OWN_ORIGINS, hasKey })) {
        console.warn(`[security] cross-site ${method} ${path} refused, from ${h.get('origin')} (${ip})`)
        note(ev, { kind: 'cross_site', ip, method, path, detail: h.get('origin') })
        return refuse(403, 'This request came from another website and was refused')
    }
    // someone who is not signed in cannot flood the server with changes
    const signedIn = !!req.auth || /trtportal=/.test(h.get('cookie') || '')
    if (countsAsAnonymousWrite({ method, path, signedIn })) {
        try {
            rateLimit(`anon:${ip}`, ANON_WRITES_PER_MINUTE, 60000)
        } catch (e) {
            console.warn(`[security] too many requests without a session: ${method} ${path} (${ip})`)
            note(ev, { kind: 'flood', ip, method, path })
            return refuse(429, e.message, { 'Retry-After': String(e.retryAfter || 60) })
        }
    }
    return null
}

export default auth((req, ev) => {
    const { nextUrl } = req
    const isSignedIn = !!req.auth

    const blocked = shield(req, ev)
    if (blocked) return blocked

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
            /** A sign-in another app asked for (Meet): go back to its authorization request, not to the CRM home */
            const back = nextUrl.searchParams.get(REDIRECT_URL_KEY)
            if (back && back.startsWith('/api/oauth/')) return Response.redirect(new URL(back, nextUrl))
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
