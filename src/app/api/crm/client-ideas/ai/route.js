import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { helperStatus, researchClient } from '@/lib/crm/clientIdeasAi'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) { try { return NextResponse.json(await helperStatus(request.nextUrl.searchParams.get('clientId'))) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await researchClient(b.clientId, b)) } catch (e) { return errorResponse(e) } }
