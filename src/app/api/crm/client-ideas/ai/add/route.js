import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { addAiIdeas } from '@/lib/crm/clientIdeasAi'

export const dynamic = 'force-dynamic'

export async function POST(request) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await addAiIdeas(b.clientId, b), { status: 201 }) } catch (e) { return errorResponse(e) } }
