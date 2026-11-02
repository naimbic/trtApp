import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listClosed, addClosed, removeClosed } from '@/lib/crm/closedDaysApi'

export const dynamic = 'force-dynamic'

// The days the team takes no appointments. GET: the ones still to come · POST { fromDay, toDay?, label? } · DELETE ?id=
export async function GET() { try { return NextResponse.json(await listClosed()) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await addClosed(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function DELETE(request) { try { return NextResponse.json(await removeClosed(request.nextUrl.searchParams.get('id'))) } catch (e) { return errorResponse(e) } }
