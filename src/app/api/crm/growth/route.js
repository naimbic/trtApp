import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { getGrowth } from '@/lib/crm/growthApi'

export async function GET() { try { return NextResponse.json(await getGrowth()) } catch (e) { return errorResponse(e) } }
