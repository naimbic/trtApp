import { NextResponse } from 'next/server'
import { modelsFor } from '@/lib/crm/ai/analyze'
import { errorResponse } from '@/lib/crm/crud'

// POST { provider } -> the models the saved key can use
export async function POST(request) {
    try { return NextResponse.json(await modelsFor((await request.json()).provider)) } catch (e) { return errorResponse(e) }
}
