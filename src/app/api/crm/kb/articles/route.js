import { NextResponse } from 'next/server'
import { kbManage, saveArticle } from '@/lib/crm/kbApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await kbManage()) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveArticle(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
