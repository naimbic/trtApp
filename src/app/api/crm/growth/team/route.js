import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { teamSkills } from '@/lib/crm/growthApi'

export async function GET() { try { return NextResponse.json(await teamSkills()) } catch (e) { return errorResponse(e) } }
