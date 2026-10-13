import { NextResponse } from 'next/server'
import { COOKIE, cookieOptions } from '@/lib/portal/session'

export const json = (data, init) => NextResponse.json(data, init)
export const fail = (e) => {
    if (!e.status) console.error('[portal]', e)
    return NextResponse.json({ error: e.status ? e.message : 'Something went wrong' }, { status: e.status || 500 })
}
export const withCookie = (res, value, request) => { res.cookies.set(COOKIE, value, cookieOptions(request)); return res }
export const clearCookie = (res) => { res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 }); return res }
