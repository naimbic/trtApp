import { NextResponse } from 'next/server'
import { COOKIE, cookieOptions } from '@/lib/portal/session'

export const json = (data, init) => NextResponse.json(data, init)
export const fail = (e) => {
    // a body that cannot be read (bad JSON, not a multipart form) is the caller's mistake
    if (!e.status && (e instanceof SyntaxError || (e instanceof TypeError && /content-type|formdata|multipart|body/i.test(e.message || '')))) return NextResponse.json({ error: 'The request could not be read' }, { status: 400 })
    if (!e.status) console.error('[portal]', e)
    return NextResponse.json({ error: e.status ? e.message : 'Something went wrong' }, { status: e.status || 500, headers: e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : undefined })
}
export const withCookie = (res, value, request) => { res.cookies.set(COOKIE, value, cookieOptions(request)); return res }
export const clearCookie = (res) => { res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 }); return res }
