import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { pushStatus } from '@/lib/crm/push'

export const dynamic = 'force-dynamic'

export async function GET() { try { return NextResponse.json(await pushStatus()) } catch (e) { return errorResponse(e) } }
