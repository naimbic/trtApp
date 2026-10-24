import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { mentionDirectory, notifyMentions } from '@/lib/crm/mentionsApi'

export const dynamic = 'force-dynamic'

export async function GET() {
    try { return NextResponse.json(await mentionDirectory()) } catch (e) { return errorResponse(e) }
}
export async function POST(request) {
    try { return NextResponse.json(await notifyMentions(await request.json())) } catch (e) { return errorResponse(e) }
}
