import { NextResponse } from 'next/server'
import { analyze } from '@/lib/crm/ai/analyze'
import { errorResponse } from '@/lib/crm/crud'

export const maxDuration = 120

// POST { kind: 'leads' | 'clients' | 'income', question?, provider?, model?, lang? }
export async function POST(request) {
    try { return NextResponse.json(await analyze(await request.json())) } catch (e) { return errorResponse(e) }
}
