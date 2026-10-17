import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/crm/ai/analyze'
import { errorResponse } from '@/lib/crm/crud'

// POST { provider, model } -> checks the key and the model with a tiny question
export async function POST(request) {
    try { return NextResponse.json(await testConnection(await request.json())) } catch (e) { return errorResponse(e) }
}
