import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { trackProgram } from '@/lib/crm/growApi'

export async function POST(request, { params }) { try { return NextResponse.json(await trackProgram((await params).key), { status: 201 }) } catch (e) { return errorResponse(e) } }
