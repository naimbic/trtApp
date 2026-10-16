import { NextResponse } from 'next/server'
import { inspectToken, resetPasswordWithToken } from '@/lib/crm/authTokens'

export async function GET(request) {
    return NextResponse.json(await inspectToken(request.nextUrl.searchParams.get('token')))
}

export async function POST(request) {
    try {
        const { token, password } = await request.json()
        const r = await resetPasswordWithToken(token, password)
        return NextResponse.json({ success: true, email: r.email })
    } catch (e) {
        return e instanceof SyntaxError ? NextResponse.json({ error: 'The request could not be read' }, { status: 400 }) : NextResponse.json({ error: e.message }, { status: e.status || 500 })
    }
}
