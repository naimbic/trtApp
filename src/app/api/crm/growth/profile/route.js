import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { growthProfile } from '@/lib/crm/growthApi'

export const dynamic = 'force-dynamic'
export async function GET(request) { try { return NextResponse.json(await growthProfile(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) } }
