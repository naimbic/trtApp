import { NextResponse } from 'next/server'
import { trtagencyConfig } from '@/lib/crm/trtagency/config'
import { startLogin } from '@/lib/crm/trtagency/logic'
import { createOidc, random } from '@/lib/crm/trtagency/client'
import { loginStore } from '@/lib/crm/trtagency/store'
import { rateLimit, clientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
const COOKIE = 'trtagency_login'

const back = (cfg, code) => NextResponse.redirect(new URL(`/sign-in?oidc_error=${code}`, cfg?.redirectUri || 'http://localhost'))

// GET /api/crm/auth/trtagency/login[?redirectUrl=/crm/leads]  ->  the trtAgency sign-in page
export async function GET(request) {
    const cfg = trtagencyConfig()
    if (!cfg || cfg.error) return back(cfg, 'not_configured')
    try {
        rateLimit(`oidc-login:ip:${clientIp(request)}`, 30, 10 * 60000)
        const { url, bind } = await startLogin({ oidc: createOidc(cfg), store: loginStore, rand: random, next: request.nextUrl.searchParams.get('redirectUrl') })
        const res = NextResponse.redirect(url)
        // ties the answer to this browser: another browser cannot finish a login that was started here
        res.cookies.set(COOKIE, bind, { httpOnly: true, sameSite: 'lax', secure: cfg.redirectUri.startsWith('https:'), path: '/api/crm/auth/trtagency', maxAge: 600 })
        return res
    } catch (e) {
        console.error('[trtagency] login start failed:', e?.message)
        return back(cfg, 'provider_error')
    }
}
