import { NextResponse } from 'next/server'
import { resolveShortLink } from '@/lib/crm/shortLinks'

// Public: short links from emails redirect to the real page.
export async function GET(_request, { params }) {
    const { code } = await params
    const target = await resolveShortLink(String(code || '').toLowerCase())
    if (!target) return new NextResponse('This link is no longer valid.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    return NextResponse.redirect(target, 302)
}
