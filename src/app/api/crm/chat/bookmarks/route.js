import { NextResponse } from 'next/server'
import { myBookmarks } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

export async function GET() {
    try { return NextResponse.json(await myBookmarks()) } catch (e) { return errorResponse(e) }
}
