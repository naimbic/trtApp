import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { ideaToTask } from '@/lib/crm/growApi'

export async function POST(request, { params }) { try { return NextResponse.json(await ideaToTask((await params).id, await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
