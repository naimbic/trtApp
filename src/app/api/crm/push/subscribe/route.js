import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { pushSubscribe, pushUnsubscribe } from '@/lib/crm/push'

export const dynamic = 'force-dynamic'

export async function POST(request) { try { return NextResponse.json(await pushSubscribe(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
export async function DELETE(request) { try { return NextResponse.json(await pushUnsubscribe((await request.json().catch(() => ({}))).endpoint)) } catch (e) { return errorResponse(e) } }
