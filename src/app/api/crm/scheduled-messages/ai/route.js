import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { writeWithAi } from '@/lib/crm/scheduledMessages'

export async function POST(request) { try { return NextResponse.json(await writeWithAi(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
