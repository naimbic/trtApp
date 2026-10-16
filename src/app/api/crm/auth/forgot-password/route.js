import { NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/crm/account'

export async function POST(request) {
    try {
        const { email } = await request.json()
        return NextResponse.json(await requestPasswordReset(email, request))
    } catch (e) {
        return e instanceof SyntaxError ? NextResponse.json({ error: 'The request could not be read' }, { status: 400 }) : NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
