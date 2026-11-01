import { NextResponse } from 'next/server'
import { userinfo } from '@/lib/crm/oauth'

export const dynamic = 'force-dynamic'
const run = async (request) => {
    try { return NextResponse.json(await userinfo(request.headers.get('authorization')), { headers: { 'cache-control': 'no-store' } }) } catch (e) {
        return NextResponse.json({ error: e.oauth || 'invalid_request', error_description: e.message }, { status: e.status || 400, headers: { 'cache-control': 'no-store', 'www-authenticate': 'Bearer error="invalid_token"' } })
    }
}
export const GET = run
export const POST = run
