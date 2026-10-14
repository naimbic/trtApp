import { NextResponse } from 'next/server'
import { previewAsContact } from '@/lib/portal/auth'
import { COOKIE, cookieOptions } from '@/lib/portal/session'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const b = await request.json().catch(() => ({}))
        const { value, name } = await previewAsContact((await params).id, b.contactId)
        const res = NextResponse.json({ url: '/portal', name })
        res.cookies.set(COOKIE, value, { ...cookieOptions(request), maxAge: 2 * 3600 })
        return res
    } catch (e) { return errorResponse(e) }
}
