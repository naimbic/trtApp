import { NextResponse } from 'next/server'
import { token } from '@/lib/crm/oauth'

export const dynamic = 'force-dynamic'
const H = { 'cache-control': 'no-store', pragma: 'no-cache' }

export async function POST(request) {
    try {
        const form = Object.fromEntries((await request.formData().catch(() => new FormData())).entries())
        return NextResponse.json(await token(form, request.headers.get('authorization'), request), { headers: H })
    } catch (e) {
        return NextResponse.json({ error: e.oauth || (e.status === 429 ? 'slow_down' : 'invalid_request'), error_description: e.message }, { status: e.status || 400, headers: H })
    }
}
