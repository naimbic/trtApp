import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { moveRequest } from '@/lib/crm/clientRequestsApi'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await moveRequest(b.clientId, (await params).id, b)) } catch (e) { return errorResponse(e) } }
