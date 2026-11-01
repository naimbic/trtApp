import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listScheduled, saveScheduled } from '@/lib/crm/scheduledMessages'

export async function GET() { try { return NextResponse.json(await listScheduled()) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await saveScheduled(null, await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
