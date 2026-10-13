import { NextResponse } from 'next/server'
import { getBranding } from '@/lib/crm/settings/settingsApi'

// Public: name, logos and favicon (used by the sign-in page and the browser tab).
export async function GET() {
    return NextResponse.json(await getBranding(), { headers: { 'Cache-Control': 'public, max-age=60' } })
}
