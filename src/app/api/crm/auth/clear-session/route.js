import { NextResponse } from 'next/server'

// POST /api/crm/auth/clear-session: expires every session cookie this browser may hold (also leftovers from earlier
// deployments with another secret, which can shadow the fresh one and make a correct sign-in look like a wrong password).
const NAMES = ['authjs.session-token', '__Secure-authjs.session-token', 'next-auth.session-token', '__Secure-next-auth.session-token']

export async function POST() {
    const res = NextResponse.json({ ok: true })
    for (const name of NAMES) {
        for (const suffix of ['', '.0', '.1', '.2']) {
            res.cookies.set(`${name}${suffix}`, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: name.startsWith('__Secure-') })
        }
    }
    return res
}
