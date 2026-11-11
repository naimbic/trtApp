import { NextResponse } from 'next/server'
import { recordClick } from '@/lib/crm/mailTrackApi'

/** A tracked link of a mail: notes the click, then sends the visitor to the real address. Only a link that was really in the mail (signed) is followed. */
export async function GET(request, { params }) {
    const { token } = await params
    const q = new URL(request.url).searchParams
    let to = null
    try { to = await recordClick(String(token || ''), q.get('u') || '', q.get('s') || '') } catch (e) { console.error('[mail click]', e.message) }
    if (!to) return new NextResponse('This link is not valid', { status: 404, headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.redirect(to, { status: 302, headers: { 'Cache-Control': 'no-store' } })
}
