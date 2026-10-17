import { NextResponse } from 'next/server'
import { figures } from '@/lib/crm/ai/analyze'
import { errorResponse } from '@/lib/crm/crud'

// GET ?kind=leads|clients|income -> the figures alone, no AI
export async function GET(request) {
    try { return NextResponse.json(await figures(request.nextUrl.searchParams.get('kind'))) } catch (e) { return errorResponse(e) }
}
