import { NextResponse } from 'next/server'
import { notificationFeed, markNotificationsSeen } from '@/lib/crm/notifications'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try { return NextResponse.json(await notificationFeed({ days: request.nextUrl.searchParams.get('days') })) } catch (e) { return errorResponse(e) }
}

// POST (no body) = mark everything read · { action: 'read' | 'unread', ids: [...] } = those items
export async function POST(request) {
    try { return NextResponse.json(await markNotificationsSeen(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}
