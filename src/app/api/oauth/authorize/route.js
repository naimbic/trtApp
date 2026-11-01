import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { authorize, issuer } from '@/lib/crm/oauth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    const url = new URL(request.url)
    const session = await auth()
    const r = await authorize(Object.fromEntries(url.searchParams), session?.user?.imp ? null : session?.user?.id)
    if (r.error) return new Response(`Sign-in error: ${r.error}`, { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
    if (r.signIn) return NextResponse.redirect(`${issuer()}/sign-in?redirectUrl=${encodeURIComponent(`/api/oauth/authorize${url.search}`)}`, 302)
    return NextResponse.redirect(r.redirect, 302)
}
