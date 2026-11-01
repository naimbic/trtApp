import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { moveIdea } from '@/lib/crm/clientIdeasApi'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await moveIdea(b.clientId, (await params).id, b)) } catch (e) { return errorResponse(e) } }
