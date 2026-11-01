import { NextResponse } from 'next/server'
import { listClients, createClient } from '@/lib/crm/oauth'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() { try { return NextResponse.json(await listClients()) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await createClient(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
