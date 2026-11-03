import { NextResponse } from 'next/server'
import { coachStatus, sendNow } from '@/lib/crm/coach'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET -> { ready, month, last } · POST { who: 'me' | 'all' } -> writes last month's team review now and sends it to the chat
export async function GET() { try { return NextResponse.json(await coachStatus()) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await sendNow(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
