import { NextResponse } from 'next/server'
import { checklist } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await checklist((await params).id, await request.json())) } catch (e) { return errorResponse(e) }
}
