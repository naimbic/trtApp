import { NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/crm/account'

export async function POST(request) {
    try {
        const { email } = await request.json()
        return NextResponse.json(await requestPasswordReset(email, request))
    } catch (e) {
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
