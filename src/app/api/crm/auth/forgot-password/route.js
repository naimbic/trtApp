import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { requestPasswordReset } from '@/lib/crm/account'

export async function POST(request) {
    try {
        rateLimit(`forgot:ip:${clientIp(request)}`, 5, 15 * 60000)
        const { email } = await request.json()
        rateLimit(`forgot:email:${String(email || '').trim().toLowerCase()}`, 3, 15 * 60000) // nobody can flood one inbox
        return NextResponse.json(await requestPasswordReset(email, request))
    } catch (e) {
        if (e.status === 429) return NextResponse.json({ error: e.message }, { status: 429, headers: { 'Retry-After': String(e.retryAfter) } })
        return e instanceof SyntaxError ? NextResponse.json({ error: 'The request could not be read' }, { status: 400 }) : NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
