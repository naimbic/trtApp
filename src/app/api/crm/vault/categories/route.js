import { NextResponse } from 'next/server'
import { saveCategory } from '@/lib/crm/vaultApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await saveCategory(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}
