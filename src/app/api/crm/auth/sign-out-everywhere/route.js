import { NextResponse } from 'next/server'
import { signOutOwnDevices } from '@/lib/crm/account'

export async function POST() {
    try {
        return NextResponse.json(await signOutOwnDevices())
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: e.status || 500 })
    }
}
