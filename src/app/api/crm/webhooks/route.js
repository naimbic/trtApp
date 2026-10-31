import { NextResponse } from 'next/server'
import { listWebhooks, saveWebhook } from '@/lib/crm/webhooks'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() { try { return NextResponse.json(await listWebhooks()) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await saveWebhook(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
