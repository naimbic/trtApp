import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { changeOwnPassword } from '@/lib/crm/account'

export async function POST(request) {
    try {
        rateLimit(`pw:ip:${clientIp(request)}`, 10, 15 * 60000)
        return NextResponse.json(await changeOwnPassword(await request.json()))
    } catch (e) {
        return e instanceof SyntaxError ? NextResponse.json({ error: 'The request could not be read' }, { status: 400 }) : NextResponse.json({ error: e.message }, { status: e.status || 500 })
    }
}
