import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { growOverview } from '@/lib/crm/growApi'

export async function GET() { try { return NextResponse.json(await growOverview()) } catch (e) { return errorResponse(e) } }
