import { NextResponse } from 'next/server'
import { changeOwnPassword } from '@/lib/crm/account'

export async function POST(request) {
    try {
        return NextResponse.json(await changeOwnPassword(await request.json()))
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: e.status || 500 })
    }
}
