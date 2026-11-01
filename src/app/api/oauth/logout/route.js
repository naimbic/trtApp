import { NextResponse } from 'next/server'
import { signOut } from '@/auth'
import { logoutTarget, issuer } from '@/lib/crm/oauth'

export const dynamic = 'force-dynamic'

/** RP-initiated sign-out: ends the CRM session, then goes back to the app (only to an address registered for it). */
export async function GET(request) {
    const p = new URL(request.url).searchParams
    const to = await logoutTarget(p.get('client_id'), p.get('post_logout_redirect_uri'))
    await signOut({ redirect: false }).catch(() => {})
    return NextResponse.redirect(to ? `${to}${to.includes('?') ? '&' : '?'}${p.get('state') ? `state=${encodeURIComponent(p.get('state'))}` : ''}`.replace(/[?&]$/, '') : `${issuer()}/sign-in`, 302)
}
