import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { listGoals, saveGoal } from '@/lib/crm/growthApi'

export async function GET(request) { try { return NextResponse.json(await listGoals(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await saveGoal(null, await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
