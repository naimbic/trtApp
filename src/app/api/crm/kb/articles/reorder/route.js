import { NextResponse } from 'next/server'
import { reorderArticles } from '@/lib/crm/kbApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await reorderArticles(await request.json())) } catch (e) { return errorResponse(e) }
}
