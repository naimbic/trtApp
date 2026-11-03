import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listMine, addMine, removeMine } from '@/lib/crm/myRemindersApi'

export const dynamic = 'force-dynamic'

// My reminders on a record (a task, a lead, a client, a ticket...). GET ?relType=&relId= · POST { relType, relId, date, note?, notifyByEmail? } · DELETE ?id=
export async function GET(request) { try { const q = request.nextUrl.searchParams; return NextResponse.json(await listMine({ relType: q.get('relType'), relId: q.get('relId') })) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await addMine(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function DELETE(request) { try { return NextResponse.json(await removeMine(request.nextUrl.searchParams.get('id'))) } catch (e) { return errorResponse(e) } }
