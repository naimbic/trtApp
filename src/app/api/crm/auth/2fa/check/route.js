import { NextResponse } from 'next/server'
import { verifyLogin } from '@/lib/crm/loginCheck'
import { twoFactorStatus } from '@/lib/crm/twoFactor'

// First sign-in step: is a second step needed? (Wrong password or unknown email just answers "no" so nothing is revealed;
// the real sign-in then fails with the usual message.)
export async function POST(request) {
    try {
        const { email, password } = await request.json()
        const r = await verifyLogin(email, password)
        if (r.locked) return NextResponse.json({ twoFactor: false, locked: true, minutes: r.minutes })
        if (!r.user) return NextResponse.json({ twoFactor: false })
        const s = await twoFactorStatus(r.user.id)
        return NextResponse.json({ twoFactor: s.enabled, methods: { app: s.app, email: s.email } })
    } catch (e) {
        return e instanceof SyntaxError ? NextResponse.json({ error: 'The request could not be read' }, { status: 400 }) : NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
