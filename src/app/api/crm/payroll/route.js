import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { payrollOverview } from '@/lib/crm/payroll'

export async function GET(request) {
    try { return NextResponse.json(await payrollOverview(request.nextUrl.searchParams.get('year'))) } catch (e) { return errorResponse(e) }
}
