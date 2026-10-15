import { NextResponse } from 'next/server'
import { getBranding } from '@/lib/crm/settings/settingsApi'

// Public: the favicon chosen in Settings -> General. Every page (the app, the sign-in pages and the public invoice, estimate,
// proposal and contract pages) points its <link rel="icon"> here, so there is no default icon file to go out of date.
export async function GET() {
    const { favicon } = await getBranding()
    if (!favicon) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } })
    return NextResponse.redirect(favicon, { status: 302, headers: { 'Cache-Control': 'public, max-age=300' } })
}
