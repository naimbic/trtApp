import { NextResponse } from 'next/server'
import { reportsMeta } from '@/lib/crm/reportsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await reportsMeta()) } catch (e) { return errorResponse(e) }
}
