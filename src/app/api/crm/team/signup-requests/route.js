import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listRequests } from '@/lib/crm/signupRequests'

export const dynamic = 'force-dynamic'

export async function GET(request) { try { return NextResponse.json(await listRequests({ all: request.nextUrl.searchParams.get('all') === '1' })) } catch (e) { return errorResponse(e) } }
