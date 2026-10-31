import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { getRoutine, saveRoutine, runNow } from '@/lib/crm/growApi'

export async function GET() { try { return NextResponse.json(await getRoutine()) } catch (e) { return errorResponse(e) } }
export async function PUT(request) { try { return NextResponse.json(await saveRoutine(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await runNow(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
