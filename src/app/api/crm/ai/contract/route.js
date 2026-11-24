import { NextResponse } from 'next/server'
import { assistContract, contractAssistStatus } from '@/lib/crm/ai/contractAssist'
import { errorResponse } from '@/lib/crm/crud'

export const maxDuration = 180

// "Write with AI" above a contract text: GET is it available · POST { action, instruction, text, language, type } -> { html }
export async function GET() {
    try { return NextResponse.json(await contractAssistStatus()) } catch (e) { return errorResponse(e) }
}
export async function POST(request) {
    try { return NextResponse.json(await assistContract(await request.json())) } catch (e) { return errorResponse(e) }
}
