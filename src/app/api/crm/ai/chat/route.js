import { NextResponse } from 'next/server'
import { reply } from '@/lib/crm/ai/chat'
import { errorResponse } from '@/lib/crm/crud'

export const maxDuration = 120

// POST { messages: [{ role: 'user' | 'assistant', content }], provider?, model?, lang? } -> { text, model, usage, ms }
export async function POST(request) {
    try { return NextResponse.json(await reply(await request.json())) } catch (e) { return errorResponse(e) }
}
