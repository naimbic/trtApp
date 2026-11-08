import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { makeTask } from '@/lib/crm/clientReportsApi'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await makeTask(b.clientId, (await params).id)) } catch (e) { return errorResponse(e) } }
