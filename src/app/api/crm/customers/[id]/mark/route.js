import { NextResponse } from 'next/server'
import { markClient } from '@/lib/crm/clientsApi'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

// My own pin / favourite on a client card: { pinned?, favorite? }
export async function POST(request, { params }) {
    try { return NextResponse.json(await markClient((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}
