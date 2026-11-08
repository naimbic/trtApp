import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listReports, saveReport } from '@/lib/crm/clientReportsApi'

export const dynamic = 'force-dynamic'

export async function GET(request) { try { return NextResponse.json(await listReports(request.nextUrl.searchParams.get('clientId'))) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await saveReport(b.clientId, b), { status: 201 }) } catch (e) { return errorResponse(e) } }
