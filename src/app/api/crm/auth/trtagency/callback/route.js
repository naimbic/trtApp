import { NextResponse } from 'next/server'
import { signIn } from '@/auth'
import { trtagencyConfig } from '@/lib/crm/trtagency/config'
import { finishLogin, LoginError } from '@/lib/crm/trtagency/logic'
import { createOidc } from '@/lib/crm/trtagency/client'
import { loginStore, issueTicket } from '@/lib/crm/trtagency/store'
import { users } from '@/lib/crm/trtagency/users'
import { buildUserAuthority } from '@/lib/crm/authBuild'
import { rateLimit, clientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
const COOKIE = 'trtagency_login'

// The address registered at trtAgency (TRTAGENCY_REDIRECT_URI). The browser comes back here with ?code&state, or ?error.
export async function GET(request) {
    const cfg = trtagencyConfig()
    const to = (path) => NextResponse.redirect(new URL(path, cfg?.redirectUri || request.url))
    const fail = (code) => { const r = to(`/sign-in?oidc_error=${code}`); r.cookies.set(COOKIE, '', { path: '/api/crm/auth/trtagency', maxAge: 0 }); return r }
    if (!cfg || cfg.error) return fail('not_configured')
    try {
        rateLimit(`oidc-callback:ip:${clientIp(request)}`, 30, 10 * 60000)
        const query = Object.fromEntries(request.nextUrl.searchParams)
        const { user, next } = await finishLogin({ query, bind: request.cookies.get(COOKIE)?.value, cfg, oidc: createOidc(cfg), store: loginStore, users })
        if ((await buildUserAuthority(user)).blocked) return fail('blocked') // a deactivated team member never gets a session
        // the normal session of the app (same cookie as a password sign-in), created from a one-time ticket
        const result = await signIn('credentials', { oidcTicket: await issueTicket(user.id), redirect: false })
        if (typeof result === 'string' && /error/i.test(result)) return fail('blocked')
        const res = to(next)
        res.cookies.set(COOKIE, '', { path: '/api/crm/auth/trtagency', maxAge: 0 })
        return res
    } catch (e) {
        if (e instanceof LoginError) { if (e.detail) console.error(`[trtagency] ${e.code}:`, e.detail); return fail(e.code) }
        console.error('[trtagency] callback failed:', e?.message)
        return fail('provider_error')
    }
}
