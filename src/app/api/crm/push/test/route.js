import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { pushTest } from '@/lib/crm/push'

export const dynamic = 'force-dynamic'

export async function POST() { try { return NextResponse.json(await pushTest()) } catch (e) { return errorResponse(e) } }
