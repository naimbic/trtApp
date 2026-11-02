import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { payPrime } from '@/lib/crm/growthApi'

export const dynamic = 'force-dynamic'

// A manager pays the monthly prime of one member: { staffId, month: 'YYYY-MM' }. The amount is decided on the server.
export async function POST(request) { try { return NextResponse.json(await payPrime(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
