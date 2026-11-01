import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { rejectRequest } from '@/lib/crm/signupRequests'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) { try { return NextResponse.json(await rejectRequest((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
