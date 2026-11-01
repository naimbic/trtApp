import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { listPrograms } from '@/lib/crm/growApi'

export async function GET() { try { return NextResponse.json(await listPrograms()) } catch (e) { return errorResponse(e) } }
