import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { moveReport } from '@/lib/crm/clientReportsApi'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await moveReport(b.clientId, (await params).id, b)) } catch (e) { return errorResponse(e) } }
