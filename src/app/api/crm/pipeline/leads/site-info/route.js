import { NextResponse } from 'next/server'
import { siteInfo } from '@/lib/crm/siteInfo'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET ?url=<website of a lead> -> is it online, DNS, whois (domain age, registrar), and the SEO figures when an Ubersuggest key is saved
export async function GET(request) {
    try { const q = request.nextUrl.searchParams; return NextResponse.json(await siteInfo(q.get('url'), { force: q.get('force') === '1' })) } catch (e) { return errorResponse(e) }
}
