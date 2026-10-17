import { NextResponse } from 'next/server'
import { getAiSettings, saveAiSettings } from '@/lib/crm/ai/aiSettings'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await getAiSettings()) } catch (e) { return errorResponse(e) }
}
// PUT { keys: { openai: 'sk-…' | null }, models: { openai: 'gpt-4o' }, provider, model, systemPrompt }  (super administrator only)
export async function PUT(request) {
    try { return NextResponse.json(await saveAiSettings(await request.json())) } catch (e) { return errorResponse(e) }
}
