import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listAllMine, addFree } from '@/lib/crm/myRemindersApi'

export const dynamic = 'force-dynamic'

// The Reminders page: all my reminders (GET), a free reminder with no record (POST { note, date }).
export async function GET() { try { return NextResponse.json(await listAllMine()) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await addFree(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
