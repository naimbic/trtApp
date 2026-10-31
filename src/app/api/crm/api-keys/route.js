import { NextResponse } from 'next/server'
import { listKeys, createKey } from '@/lib/crm/apiKeys'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() { try { return NextResponse.json(await listKeys()) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await createKey(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
