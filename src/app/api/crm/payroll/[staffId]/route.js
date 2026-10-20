import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { getPayroll, saveSalary } from '@/lib/crm/payroll'

export async function GET(request, { params }) {
    try { return NextResponse.json(await getPayroll((await params).staffId)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveSalary((await params).staffId, await request.json())) } catch (e) { return errorResponse(e) }
}
