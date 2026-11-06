import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listEvents } from '@/lib/crm/eventsListApi'

export const dynamic = 'force-dynamic'

// GET ?from=&to= (ISO dates): the events of that period for the Calendar events page
export async function GET(request) { try { return NextResponse.json(await listEvents(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) } }
