import { NextResponse } from 'next/server'
import { notificationFeed } from '@/lib/crm/notifications'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await notificationFeed()) } catch (e) { return errorResponse(e) }
}
