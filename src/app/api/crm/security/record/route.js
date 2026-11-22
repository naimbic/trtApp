import { NextResponse } from 'next/server'
import { recordSecurity, shieldKey } from '@/lib/crm/securityLog'

/** The request shield tells here what it refused. Only the server itself knows the key. */
export async function POST(request) {
    if (request.headers.get('x-shield-key') !== shieldKey()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const b = await request.json().catch(() => ({}))
    await recordSecurity({ kind: b.kind, ip: b.ip, method: b.method, path: b.path, detail: b.detail })
    return NextResponse.json({ ok: true })
}
