import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { verifyLogin } from '@/lib/crm/loginCheck'
import { loginStatus } from '@/lib/crm/twoFactor'

// First sign-in step: is a second step needed? (Wrong password or unknown email just answers "no" so nothing is revealed;
// the real sign-in then fails with the usual message.)
export async function POST(request) {
    try {
        rateLimit(`2fa-check:ip:${clientIp(request)}`, 30, 60000)
        const { email, password } = await request.json()
        const r = await verifyLogin(email, password)
        if (r.locked) return NextResponse.json({ twoFactor: false, locked: true, minutes: r.minutes })
        if (!r.user) return NextResponse.json({ twoFactor: false })
        const s = await loginStatus(r.user.id)
        return NextResponse.json({ twoFactor: s.enabled, methods: { app: s.app, email: s.email } })
    } catch (e) {
        if (e.status === 429) return NextResponse.json({ error: e.message }, { status: 429, headers: { 'Retry-After': String(e.retryAfter) } })
        return e instanceof SyntaxError ? NextResponse.json({ error: 'The request could not be read' }, { status: 400 }) : NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
