import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { approveRequest } from '@/lib/crm/signupRequests'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) { try { return NextResponse.json(await approveRequest((await params).id, await request.json().catch(() => ({})), request)) } catch (e) { return errorResponse(e) } }
