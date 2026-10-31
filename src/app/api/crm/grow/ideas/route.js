import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { listIdeas, saveIdea } from '@/lib/crm/growApi'

export async function GET(request) { try { return NextResponse.json(await listIdeas(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await saveIdea(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
