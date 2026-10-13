import { NextResponse } from 'next/server'
import { verifyLogin } from '@/lib/crm/loginCheck'
import { sendLoginEmailCode } from '@/lib/crm/twoFactor'

// Emails a sign-in code. Needs the correct password, so it cannot be used to spam other people's inboxes.
export async function POST(request) {
    try {
        const { email, password } = await request.json()
        const r = await verifyLogin(email, password)
        if (!r.user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
        return NextResponse.json(await sendLoginEmailCode(r.user))
    } catch (e) {
        return NextResponse.json({ error: e.message || 'Could not send the code' }, { status: e.status || 500 })
    }
}
