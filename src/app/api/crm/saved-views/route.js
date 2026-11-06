import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listViews, addView } from '@/lib/crm/savedViewsApi'

export const dynamic = 'force-dynamic'

// GET ?page=leads → my views and the shared ones · POST { page, name, state, shared? }
export async function GET(request) { try { return NextResponse.json(await listViews(request.nextUrl.searchParams.get('page'))) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await addView(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
