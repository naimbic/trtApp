import { NextResponse } from 'next/server'
import { getFeed } from '@/lib/crm/calendar'

const fail = (e) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || 500 })

export async function GET() {
    try {
        return NextResponse.json(await getFeed())
    } catch (e) {
        return fail(e)
    }
}

export async function POST() {
    try {
        return NextResponse.json(await getFeed({ regenerate: true }))
    } catch (e) {
        return fail(e)
    }
}
